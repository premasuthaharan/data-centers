import json

from snapshot_utils import prune_snapshots, write_snapshot


class TestWriteSnapshot:
    def test_writes_file_named_by_date(self, tmp_path):
        out_dir = tmp_path / "snapshots"
        path = write_snapshot({"generated_at": "x", "data_centers": []}, "2026-01-15", str(out_dir))
        assert path == str(out_dir / "2026-01-15.json")
        assert (out_dir / "2026-01-15.json").exists()

    def test_content_matches_input(self, tmp_path):
        out_dir = tmp_path / "snapshots"
        data = {"generated_at": "2026-01-15T00:00:00+00:00", "data_centers": [{"id": "a"}]}
        write_snapshot(data, "2026-01-15", str(out_dir))
        written = json.loads((out_dir / "2026-01-15.json").read_text())
        assert written == data

    def test_creates_snapshots_dir_if_absent(self, tmp_path):
        out_dir = tmp_path / "does" / "not" / "exist"
        write_snapshot({"generated_at": "x", "data_centers": []}, "2026-01-15", str(out_dir))
        assert out_dir.exists()

    def test_overwrites_existing_snapshot_for_same_date(self, tmp_path):
        out_dir = tmp_path / "snapshots"
        write_snapshot({"generated_at": "first", "data_centers": []}, "2026-01-15", str(out_dir))
        write_snapshot({"generated_at": "second", "data_centers": []}, "2026-01-15", str(out_dir))

        files = list(out_dir.glob("2026-01-15*.json"))
        assert len(files) == 1
        assert json.loads(files[0].read_text())["generated_at"] == "second"


class TestPruneSnapshots:
    def test_keep_all_policy_removes_nothing(self, tmp_path):
        out_dir = tmp_path / "snapshots"
        out_dir.mkdir()
        for name in ("2026-01-01.json", "2026-02-01.json", "2025-06-01.json"):
            (out_dir / name).write_text("{}")

        removed = prune_snapshots(str(out_dir))

        assert removed == []
        assert sorted(p.name for p in out_dir.iterdir()) == [
            "2025-06-01.json",
            "2026-01-01.json",
            "2026-02-01.json",
        ]

    def test_unknown_policy_raises(self, tmp_path):
        import pytest

        with pytest.raises(ValueError, match="Unknown retention policy"):
            prune_snapshots(str(tmp_path), policy="quarterly")
