# Demon head — portable 3D asset

Import `Demon_Head.glb` into your 3D application or viewer. It contains the full one-million-triangle head-and-neck bust and embedded PBR textures. Cameras, background and studio lights are excluded.

The Blender material finish is baked into a 2K base-color map, 2K roughness map, 2K emission map and 4K tangent-space normal map. The emissive eyes use `KHR_materials_emissive_strength`. Visible bloom is a renderer effect and must be enabled in the destination application if desired. Blender's subsurface scattering and studio lighting are not part of the GLB material.

Separate texture PNGs are included for manual material workflows. The finished editable Blender source remains in the parent folder as `Demon_Head.blend`.

Coordinates preserve the original Blender scene size and orientation, exported in glTF's Y-up convention. This is a static, unrigged, high-detail asset.
