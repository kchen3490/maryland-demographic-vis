import json
import urllib.request
import urllib.parse
import os

# Load API_KEY from .env file or environment variables
API_KEY = None
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                key, val = line.strip().split("=", 1)
                if key.strip() == "API_KEY":
                    API_KEY = val.strip().strip('"').strip("'")

if not API_KEY:
    API_KEY = os.environ.get("API_KEY")

if not API_KEY:
    print("Error: API_KEY not found in .env file or environment variables.")
    exit(1)
YEAR = "2022"
DATASET = "acs/acs5"
STATE_FIPS = "24" # Maryland

# Variables to fetch
# B01003_001E: Total Population
# B03002_003E: White alone (Not Hispanic or Latino)
# B03002_004E: Black or African American alone (Not Hispanic or Latino)
# B03002_005E: American Indian and Alaska Native alone (Not Hispanic or Latino)
# B03002_006E: Asian alone (Not Hispanic or Latino)
# B03002_007E: Native Hawaiian and Other Pacific Islander alone (Not Hispanic or Latino)
# B03002_008E: Some other race alone (Not Hispanic or Latino)
# B03002_009E: Two or more races (Not Hispanic or Latino)
# B03002_012E: Hispanic or Latino (Total, any race)

VARIABLES = [
    "NAME",
    "B01003_001E",
    "B03002_003E",
    "B03002_004E",
    "B03002_005E",
    "B03002_006E",
    "B03002_007E",
    "B03002_008E",
    "B03002_009E",
    "B03002_012E"
]

def fetch_census_data():
    base_url = f"https://api.census.gov/data/{YEAR}/{DATASET}"
    get_vars = ",".join(VARIABLES)
    
    params = {
        "get": get_vars,
        "for": "county:*",
        "in": f"state:{STATE_FIPS}",
        "key": API_KEY
    }
    
    query_string = urllib.parse.urlencode(params)
    url = f"{base_url}?{query_string}"
    
    print(f"Fetching Census data from: {url.replace(API_KEY, 'REDACTED')}")
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Save the data
            os.makedirs("data", exist_ok=True)
            out_path = os.path.join("data", "census_demographics.json")
            
            with open(out_path, "w", encoding='utf-8') as f:
                json.dump(data, f, indent=2)
                
            print(f"Successfully fetched {len(data)-1} rows (excluding header).")
            print(f"Saved raw data to {out_path}")
            
    except Exception as e:
        print(f"Error fetching Census data: {e}")

if __name__ == "__main__":
    fetch_census_data()

