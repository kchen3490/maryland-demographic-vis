import json
import urllib.request
import os

GEOJSON_URL = "https://raw.githubusercontent.com/frankrowe/maryland-geojson/master/maryland-counties.geojson"
RAW_CENSUS_PATH = os.path.join("data", "census_demographics.json")
OUT_GEOJSON_PATH = os.path.join("site", "data", "maryland_demographics.geojson")

def process_data():
    # 1. Fetch GeoJSON
    print(f"Fetching Maryland GeoJSON from {GEOJSON_URL}...")
    req = urllib.request.Request(GEOJSON_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        geojson = json.loads(response.read().decode('utf-8'))
        
    # 2. Load Raw Census Data
    if not os.path.exists(RAW_CENSUS_PATH):
        print(f"Error: Raw census data not found at {RAW_CENSUS_PATH}. Run fetch_census.py first.")
        return
        
    with open(RAW_CENSUS_PATH, "r", encoding='utf-8') as f:
        census_data = json.load(f)
        
    header = census_data[0]
    rows = census_data[1:]
    
    # Map census data by county name
    # E.g. "Allegany County, Maryland" -> "Allegany"
    # "Baltimore city, Maryland" -> "Baltimore City"
    census_lookup = {}
    for row in rows:
        name_full = row[header.index("NAME")]
        
        # Clean up name to match GeoJSON properties.name
        name_clean = name_full.replace(" County, Maryland", "")
        if name_clean == "Baltimore city, Maryland":
            name_clean = "Baltimore City"
            
        census_lookup[name_clean] = {
            "total_pop": int(row[header.index("B01003_001E")]),
            "white_count": int(row[header.index("B03002_003E")]),
            "black_count": int(row[header.index("B03002_004E")]),
            "native_count": int(row[header.index("B03002_005E")]),
            "asian_count": int(row[header.index("B03002_006E")]),
            "islander_count": int(row[header.index("B03002_007E")]),
            "other_count": int(row[header.index("B03002_008E")]),
            "two_or_more_count": int(row[header.index("B03002_009E")]),
            "hispanic_count": int(row[header.index("B03002_012E")])
        }
        
    # 3. Merge data into GeoJSON
    matched_count = 0
    for feature in geojson['features']:
        county_name = feature['properties']['name']
        
        if county_name in census_lookup:
            data = census_lookup[county_name]
            matched_count += 1
            
            total = data["total_pop"]
            
            # Add counts and calculate percentages
            feature['properties']['total_pop'] = total
            
            for key in ["white", "black", "native", "asian", "islander", "other", "two_or_more", "hispanic"]:
                count = data[f"{key}_count"]
                pct = (count / total) * 100 if total > 0 else 0
                feature['properties'][f"{key}_count"] = count
                feature['properties'][f"{key}_pct"] = pct
                
        else:
            print(f"Warning: No census data found for {county_name}")
            
    print(f"Successfully merged census data for {matched_count} out of {len(geojson['features'])} jurisdictions.")
    
    # 4. Save processed GeoJSON
    os.makedirs(os.path.dirname(OUT_GEOJSON_PATH), exist_ok=True)
    with open(OUT_GEOJSON_PATH, "w", encoding='utf-8') as f:
        json.dump(geojson, f)
        
    print(f"Saved processed GeoJSON to {OUT_GEOJSON_PATH}")

if __name__ == "__main__":
    process_data()

