"""Blender script to convert USDZ to GLB. Run via:
   /Applications/Blender.app/Contents/MacOS/Blender --background --python convert_usdz_to_glb.py -- input.usdz output.glb
"""
import bpy
import sys

# Parse args after "--"
argv = sys.argv[sys.argv.index("--") + 1:]
if len(argv) < 2:
    print("Usage: blender --background --python convert_usdz_to_glb.py -- input.usdz output.glb")
    sys.exit(1)

input_path = argv[0]
output_path = argv[1]

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import USDZ (Blender treats it as USD)
print(f"Importing {input_path}...")
bpy.ops.wm.usd_import(filepath=input_path)

# Export as GLB
print(f"Exporting to {output_path}...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_image_format='WEBP',
    export_image_quality=85,
)

print(f"Done! Saved {output_path}")
