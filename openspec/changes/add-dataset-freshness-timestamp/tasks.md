## 1. Data format change
- [x] 1.1 Change `datacenters.json`'s top-level shape from a bare array to
      `{"generated_at": "<ISO8601>", "data_centers": [...]}`
- [x] 1.2 Update `fetch_data.py` to write `generated_at =
      datetime.now(timezone.utc).isoformat()` at generation time

## 2. Backend
- [x] 2.1 Update `load_datacenters()` in `logic.py` to read the new
      structure and cache both the timestamp and the list
- [x] 2.2 Add a way to retrieve `generated_at` (e.g. a
      `get_dataset_metadata()` helper)
- [x] 2.3 Include `generated_at` in the `/api/datacenters` response (e.g. as
      a sibling key, not nested inside the array)

## 3. Frontend
- [x] 3.1 Read `generated_at` from the API response in `App.jsx`
- [x] 3.2 Display "Data as of {formatted date}" in the header or footer

## 4. Verification
- [x] 4.1 Regenerate the dataset and confirm the timestamp round-trips
      through the API to the UI
- [x] 4.2 Confirm existing consumers of `datacenters.json`'s array shape
      (e.g. `nearest_datacenters`) still work after the structure change
