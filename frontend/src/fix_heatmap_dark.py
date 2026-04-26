import re

with open('C:/Solution Codex/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update SevaMap to use Google Maps for both modes
# This ensures correct Indian borders everywhere
old_tiles_block = """        {mapStyle === 'dark' || mapStyle === 'heatmap' ? (
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB" 
          />
        ) : ("""

new_tiles_block = """        {mapStyle === 'dark' || mapStyle === 'heatmap' ? (
          <TileLayer 
            url="https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&region=IN" 
            attribution="&copy; Google Maps (India API)"
          />
        ) : ("""

if old_tiles_block in content:
    content = content.replace(old_tiles_block, new_tiles_block)
    print("Google Maps tiles updated for both modes.")
else:
    # Backup regex attempt
    pattern = r'\{mapStyle === \'dark\' \|\| mapStyle === \'heatmap\' \? \(.*?<TileLayer.*?/>.*?\) : \('
    replacement = """{mapStyle === 'dark' || mapStyle === 'heatmap' ? (
          <TileLayer 
            url="https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}&region=IN" 
            attribution="&copy; Google Maps (India API)"
          />
        ) : ("""
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    print("Regex: Google Maps tiles updated.")

# 2. Ensure dark-tiles class applies to both Heatmap and Google Streets (which we'll invert)
old_class = "className={mapStyle === 'heatmap' ? 'dark-tiles' : ''}"
new_class = "className={(mapStyle === 'heatmap' || mapStyle === 'dark') ? 'dark-tiles' : ''}"
content = content.replace(old_class, new_class)

# 3. Increase blur in STYLES
content = content.replace("filter: blur(25px)", "filter: blur(35px)")

with open('C:/Solution Codex/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Heatmap dark mode and borders fixed.")
