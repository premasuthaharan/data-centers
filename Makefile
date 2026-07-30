.PHONY: refresh-data

# Regenerates backend/data/datacenters.json from the Epoch AI dataset.
# Runs from backend/ so fetch_data.py's relative "data/datacenters.json"
# output path resolves correctly.
refresh-data:
	cd backend && python3 fetch_data.py
