# Toys0125 BasisVR Packages

Public VPM registry for the unofficial BasisVR compatibility port of VRCFury.
Upstream VRCFury remains the original project; this registry does not replace it.

## Add repository

Registry URL: <https://basisvpm.pages.dev/index.json>

VCC deep link: <https://basisvpm.pages.dev/> (use the **Add to VCC** button)

CLI:

```text
vpm add repo https://basisvpm.pages.dev/index.json
```

## Package

`VRCFury for BasisVR` is published as `com.toys0125.vrcfury-basis`. When Basis SDK/Vixxy comms are installed and the VRChat SDK is absent, the package automatically uses its Basis shim. Armature Link and Blendshape Optimizer are the current priority compatibility features. SPS is deferred.

Source and releases: <https://github.com/Toys0125/VRCFury>

## Release/update process

1. Update the package version in `VRCFury/com.vrcfury.vrcfury/package.json`.
2. Commit the reviewed Basis-compatible code and create a tag such as `basis-v1.0.0`.
3. The `Basis VRCFury Release` workflow validates the tag and package, builds an archive-root VPM ZIP, and creates an immutable GitHub Release.
4. The registry workflow polls public releases every 15 minutes, validates every package ZIP, preserves existing versions, and commits the generated `index.json`.
5. Cloudflare Pages publishes the `Website` directory from `main`.

No Cloudflare or GitHub credentials are stored in this repository.
