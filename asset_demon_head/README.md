# Reference demon head — Blender asset

Open **Demon_Head.blend** in Blender. The file contains a one-million-triangle textured head-and-neck bust, four horns, emissive eyes, three inspection cameras, a Cycles studio, and the original reference image. Textures and reference are packed into the blend file.

## Deliverables

- `Demon_Head.blend`: finished Blender scene, with front camera active.
- `demon_head_front.png`: 1800 × 1800 Cycles front render.
- `demon_head_three_quarter.png`: 1800 × 1800 Cycles three-quarter render.
- `demon_head_source.glb`: original generated PBR mesh before the Blender material and lighting finish.

## Editing

The textured sculpt is in collection `01 • DEMON | textured reconstruction`. Its master transform scales the original mesh without altering UVs. Studio lights and cameras are in collection `02 • STUDIO | cameras and softboxes`. Collection `03 • EYES | warm light spill` contains the two small orange lights.

The material `Demon | crimson skin, keratin, living embers` preserves the supplied color, roughness and normal textures. It adds a deep crimson color grade, nonmetallic surface response, restrained subsurface scattering, separately masked black-maroon horns, fine procedural grain and emission controlled by the `Eye Ember Mask` corner attribute. No detached glowing spheres obscure the original eye surfaces.

Use camera `CAM 02 • three quarter` for a side view. The original supplied image is packed as `REFERENCE • original supplied image` for comparison in the Image Editor.

This is a detailed triangulated display/sculpt asset, not a rigged or animation-retopologized character. Fine grain beyond the generated normal map is shading detail. Only a front reference was supplied; the side and rear forms are inferred, and this is a close reconstruction rather than an exact sculpt duplicate.

## Reproduction

Run `build_scene.py`, then `finish_scene.py`, then `refine_horns.py`, then `render_final.py` in Blender's background Python runner. Scripts expect the original reference at its supplied Downloads path and the source GLB beside the scripts. The saved Blender scene itself is self-contained.

Generated from the user's reference through the authorized Hyper3D workflow, then finished and rendered in Blender 5.2.2 LTS.

Original generation: https://hyper3d.ai/workspace/rodin/c8cdeb79-e2fd-4577-a7be-f1820128b78d
