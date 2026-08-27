# Toys0125 BasisVR Packages

Public VPM registry for unofficial BasisVR-compatible packages from Toys0125.
The landing page uses VRChat Community's official package-listing template and listing builder.

## Add repository

Registry URL: <https://vpm.toysland.pw/index.json>

VCC deep link: <https://vpm.toysland.pw/> (use the **Add to VCC** button)

CLI:

```text
vpm add repo https://vpm.toysland.pw/index.json
```

## Packages

`VRCFury for BasisVR` is published as `com.toys0125.vrcfury-basis`. When Basis SDK/Vixxy comms are installed and the VRChat SDK is absent, the package automatically uses its Basis shim. Armature Link and Blendshape Optimizer are the current priority compatibility features. SPS is deferred.

Additional packages can be added by publishing VPM-compatible ZIP assets in the configured GitHub release repositories and regenerating the listing.

Source and releases: <https://github.com/Toys0125/VRCFury>

## Release/update process

1. Update the package version in `VRCFury/com.vrcfury.vrcfury/package.json`.
2. Commit the reviewed Basis-compatible code and create a tag such as `basis-v1.0.0`.
3. The `Basis VRCFury Release` workflow validates the tag and package, builds an archive-root VPM ZIP, and creates an immutable GitHub Release.
4. The registry workflow runs VRChat Community's official multi-package listing builder, validates every package ZIP, preserves existing versions, and commits the generated listing website and `index.json`.
5. Cloudflare Pages publishes the `Website` directory from `main`.

No Cloudflare or GitHub credentials are stored in this repository.
