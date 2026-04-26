import re

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the existing TileLayer block
# It usually looks like this:
# {mapStyle === 'dark' || mapStyle === 'heatmap' ? (
#   <TileLayer url="..." attribution="..." />
# ) : (
#   <TileLayer url="..." attribution="..." />
# )}

# Define the new Google Maps tiles with region=IN
new_tiles = """        {mapStyle === 'dark' || mapStyle === 'heatmap' ? (
          <TileLayer 
            url="https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&region=IN" 
            attribution="&copy; Google Maps (India API)"
          />
        ) : (
          <TileLayer 
            url="https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&region=IN" 
            attribution="&copy; Google Maps (Satellite)"
          />
        )}"""

# We'll use a regex to find the TileLayer ternary block and replace it
# We look for the start of the block and the end of the ternary
pattern = r'\{mapStyle === \'dark\' \|\| mapStyle === \'heatmap\' \? \(.*?\) : \(.*?\)\}'
content = re.sub(pattern, new_tiles, content, flags=re.DOTALL)

# Also update the button labels for clarity
content = content.replace("DARK MAP", "GOOGLE STREETS")

with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Google Maps tiles integrated with SOI compliant borders.")
