# Changelog

## [1.3.0](https://github.com/ghoullier/warvity/compare/v1.2.0...v1.3.0) (2026-07-21)


### Features

* add cluster bomb weapon ([#60](https://github.com/ghoullier/warvity/issues/60)) ([adb8dc5](https://github.com/ghoullier/warvity/commit/adb8dc5c0660636c1cb3e0cea07a324fd47eae49))
* add flamethrower weapon ([#58](https://github.com/ghoullier/warvity/issues/58)) ([b62628e](https://github.com/ghoullier/warvity/commit/b62628ebffa8887c1bc9cffbb8078c4af3f62eb6)), closes [#53](https://github.com/ghoullier/warvity/issues/53)
* add jetpack weapon ([#61](https://github.com/ghoullier/warvity/issues/61)) ([f4fc3f3](https://github.com/ghoullier/warvity/commit/f4fc3f3c15757c99ed00a0585678c9f811459107))
* add land mine weapon + fix type union syntax from rebase ([#62](https://github.com/ghoullier/warvity/issues/62)) ([4deaf1d](https://github.com/ghoullier/warvity/commit/4deaf1d1c2d4970307f853aec5bd403eeba4f1d3))
* add shield weapon ([#59](https://github.com/ghoullier/warvity/issues/59)) ([0827de0](https://github.com/ghoullier/warvity/commit/0827de00b14e88bf898c6d0d481cda71cb192a78))
* background music with per-planet themes ([#107](https://github.com/ghoullier/warvity/issues/107)) ([00b5680](https://github.com/ghoullier/warvity/commit/00b5680fd5051a665a9333a1c2497445ee4f64e6))
* fill planet interior with gradient and atmosphere glow ([#114](https://github.com/ghoullier/warvity/issues/114)) ([9015019](https://github.com/ghoullier/warvity/commit/9015019f6ed70f08a81faf16bae808edfb45a079))
* game over screen with winner announcement and replay ([#105](https://github.com/ghoullier/warvity/issues/105)) ([cf85dcf](https://github.com/ghoullier/warvity/commit/cf85dcf20729e68744e1e04233fd0c9c7a9a758f))
* HUD visual polish (HP bars, timer arc, turn flash, weapon pill) ([#117](https://github.com/ghoullier/warvity/issues/117)) ([ff7ca01](https://github.com/ghoullier/warvity/commit/ff7ca0196736b2d0f932d885b3639509d85d482b))
* improved worm visuals and projectile trails ([#115](https://github.com/ghoullier/warvity/issues/115)) ([de13ce8](https://github.com/ghoullier/warvity/commit/de13ce86f961799e260857eef52ef6a3e7e8963a))
* multi-round mode (best of N) ([#108](https://github.com/ghoullier/warvity/issues/108)) ([068e1dd](https://github.com/ghoullier/warvity/commit/068e1ddbba00bfa7f25982ac8a44863bd9e28d0b))
* richer star field with twinkling, color variation and nebula ([#116](https://github.com/ghoullier/warvity/issues/116)) ([03e5d68](https://github.com/ghoullier/warvity/commit/03e5d6837d222ed521f6cb4cdf3807c48fca187c))
* worm animations (land squash, walk bob, death, active pulse) ([#106](https://github.com/ghoullier/warvity/issues/106)) ([65baf8f](https://github.com/ghoullier/warvity/commit/65baf8f9ba5a381257fde331b74cf31ddbae5afc))


### Bug Fixes

* call render() before destroy() to flush Phaser 4 commandBuffer ([ec83738](https://github.com/ghoullier/warvity/commit/ec837383bdac3e129f4a6baa0656da659639bd64))
* dark sub-surface layer makes craters clearly visible ([0407347](https://github.com/ghoullier/warvity/commit/0407347be226d1342034a5cf6eba6667ebba0274))
* erase RenderTexture interior so craters reveal gradient below ([f04bdba](https://github.com/ghoullier/warvity/commit/f04bdbaed40869aab9ebb205bcfae20daefa9dd4))
* full disk in RT so craters reveal dark rock at any depth ([3b27b9b](https://github.com/ghoullier/warvity/commit/3b27b9b98830413e6478252981afc79d89b1e369))
* memory leaks and lifecycle (shutdown, AudioManager, GravityBoost, TurnManager) ([#87](https://github.com/ghoullier/warvity/issues/87)) ([569d0a0](https://github.com/ghoullier/warvity/commit/569d0a0c2746e1d1fc9e20be2990b65400382e7b))
* move bedrock body deeper so grenades fall into craters ([0a41b30](https://github.com/ghoullier/warvity/commit/0a41b30929127ad69cff0f6dc25b40365e3e30e6))
* prevent gh-pages non-fast-forward push failures from concurrent workflows ([#49](https://github.com/ghoullier/warvity/issues/49)) ([f008e07](https://github.com/ghoullier/warvity/commit/f008e077d5b8812d80bacba30e3885074b1357cd))
* prevent grenades from tunnelling to planet core ([#125](https://github.com/ghoullier/warvity/issues/125)) ([cf57f81](https://github.com/ghoullier/warvity/commit/cf57f810a762d502850628b72f43c1cc2b973492))
* prevent worms falling through planet after explosions (add bedrock body) ([#118](https://github.com/ghoullier/warvity/issues/118)) ([5aff907](https://github.com/ghoullier/warvity/commit/5aff90733a474aa6e881f13e43da1ea4f20ce272))
* remove duplicate constants (DEFAULT_PLANET_STYLE, CHAR_HEIGHT) ([#91](https://github.com/ghoullier/warvity/issues/91)) ([be6e21e](https://github.com/ghoullier/warvity/commit/be6e21e3e8e8b97cb6b8674876e815cc83ef706d))
* separate planet interior fill from RenderTexture to preserve gradient through explosions ([026b8e8](https://github.com/ghoullier/warvity/commit/026b8e8dfca5e4130c58c2130182a335bf8054bb))
* setOrigin(0,0) on RenderTexture to align canvas with world coords ([87957f9](https://github.com/ghoullier/warvity/commit/87957f94c640b8035e71e9ce61af948fe381dff9))
* trajectory preview respects active weapon type ([#92](https://github.com/ghoullier/warvity/issues/92)) ([3887385](https://github.com/ghoullier/warvity/commit/3887385fac88a4c4456eaff2bf5a63f054ecf25b))
* update terrain physics body after explosions (craters are not visual-only) ([#93](https://github.com/ghoullier/warvity/issues/93)) ([d0307f4](https://github.com/ghoullier/warvity/commit/d0307f432322c2a6ad555dab721e294a7f25f0c3))
* use local coords for button hitArea in GameOverScene ([4cb888e](https://github.com/ghoullier/warvity/commit/4cb888e2f79caeb277f34e2f638bb97fb66101d3))


### Miscellaneous

* **deps-dev:** Bump @biomejs/biome from 2.5.1 to 2.5.2 ([#50](https://github.com/ghoullier/warvity/issues/50)) ([2a4f80a](https://github.com/ghoullier/warvity/commit/2a4f80a24fb0ee5caff1d1167345911f520bc3e3))
* **deps-dev:** Bump @biomejs/biome from 2.5.2 to 2.5.3 ([#119](https://github.com/ghoullier/warvity/issues/119)) ([e4ac9d3](https://github.com/ghoullier/warvity/commit/e4ac9d3cc46a9984ecff24fdd5a6f854e2cc86d9))
* **deps-dev:** Bump @biomejs/biome from 2.5.3 to 2.5.4 ([#126](https://github.com/ghoullier/warvity/issues/126)) ([9df59b9](https://github.com/ghoullier/warvity/commit/9df59b9f35235832508052b5c38c08972fe8cdc4))
* **deps-dev:** Bump @biomejs/biome from 2.5.4 to 2.5.5 ([#128](https://github.com/ghoullier/warvity/issues/128)) ([e2a0e98](https://github.com/ghoullier/warvity/commit/e2a0e98a0982f60f52f8951f2edada5e6a7e5719))
* **deps-dev:** Bump vite from 8.1.2 to 8.1.3 ([#51](https://github.com/ghoullier/warvity/issues/51)) ([fd8ead3](https://github.com/ghoullier/warvity/commit/fd8ead38cff085f26fe1201412b88f9d2b92f535))
* **deps-dev:** Bump vite from 8.1.3 to 8.1.5 ([#127](https://github.com/ghoullier/warvity/issues/127)) ([f74f21b](https://github.com/ghoullier/warvity/commit/f74f21b73c1ea80c86b53829331f981c11d665c9))
* **deps:** Bump phaser from 4.2.0 to 4.2.1 ([#122](https://github.com/ghoullier/warvity/issues/122)) ([91db7df](https://github.com/ghoullier/warvity/commit/91db7df5cf7b1b04ee15e6917f271e87aff625fd))

## [1.2.0](https://github.com/ghoullier/warvity/compare/v1.1.0...v1.2.0) (2026-06-30)


### Features

* add explosion particles and terrain debris effects ([#40](https://github.com/ghoullier/warvity/issues/40)) ([408e992](https://github.com/ghoullier/warvity/commit/408e9929fd86b4962e742481fa0692879c917cce)), closes [#32](https://github.com/ghoullier/warvity/issues/32)
* add gravity boost weapon with 2x/0.5x/reverse modes ([#42](https://github.com/ghoullier/warvity/issues/42)) ([779cda8](https://github.com/ghoullier/warvity/commit/779cda81f934be1136c63bff1073dbafe1bfde63)), closes [#34](https://github.com/ghoullier/warvity/issues/34)
* add main menu with team and worm count selection ([#39](https://github.com/ghoullier/warvity/issues/39)) ([1f212be](https://github.com/ghoullier/warvity/commit/1f212be5ce0e6ddbc09b33519f8bdf4fee8ddb2b))
* add planet styles system ([#46](https://github.com/ghoullier/warvity/issues/46)) ([ca350ca](https://github.com/ghoullier/warvity/commit/ca350ca18386d1d526972547f6e7a1ccf6fc8571)), closes [#45](https://github.com/ghoullier/warvity/issues/45)
* add procedural sound effects and background music ([#38](https://github.com/ghoullier/warvity/issues/38)) ([0f98760](https://github.com/ghoullier/warvity/commit/0f9876034179b86aa789c76ecc00da4f763e4cad)), closes [#36](https://github.com/ghoullier/warvity/issues/36)
* add singularity black hole weapon ([#43](https://github.com/ghoullier/warvity/issues/43)) ([9392e5b](https://github.com/ghoullier/warvity/commit/9392e5ba7351b9a81845d8d9564f2cd56e21db50)), closes [#33](https://github.com/ghoullier/warvity/issues/33)
* add teleporter weapon ([#41](https://github.com/ghoullier/warvity/issues/41)) ([f77d221](https://github.com/ghoullier/warvity/commit/f77d221307d045bb99073a111affb01af0310acb))
* deploy to GitHub Pages on release-please release ([#30](https://github.com/ghoullier/warvity/issues/30)) ([d04daa3](https://github.com/ghoullier/warvity/commit/d04daa37ddfbbaf2891d5d8588a8c08a1fdce6ee))


### Bug Fixes

* teleporter weapon not working ([#47](https://github.com/ghoullier/warvity/issues/47)) ([f5ef57d](https://github.com/ghoullier/warvity/commit/f5ef57dd15d18d800adf8921046500d1d638102c)), closes [#44](https://github.com/ghoullier/warvity/issues/44)

## [1.1.0](https://github.com/ghoullier/warvity/compare/v1.0.0...v1.1.0) (2026-06-30)


### Features

* add bazooka aiming system with angle and power ([#21](https://github.com/ghoullier/warvity/issues/21)) ([f89fbc1](https://github.com/ghoullier/warvity/commit/f89fbc19a98334c60e9e7ecbee6dfba1fde7ce34)), closes [#11](https://github.com/ghoullier/warvity/issues/11)
* add camera controller that follows active worm ([#16](https://github.com/ghoullier/warvity/issues/16)) ([9a1b350](https://github.com/ghoullier/warvity/commit/9a1b350a1ece3844b5a9d13140363a671713cbdc))
* add deploy workflow for main branch to GitHub Pages ([#25](https://github.com/ghoullier/warvity/issues/25)) ([ef4d8c6](https://github.com/ghoullier/warvity/commit/ef4d8c620c4ce8e3496d83559f46fdacf1839c56))
* add game over screen with winner display ([#19](https://github.com/ghoullier/warvity/issues/19)) ([24c835a](https://github.com/ghoullier/warvity/commit/24c835a8bc2d1a1fe5d6a0c01978ac64fa7bca46)), closes [#8](https://github.com/ghoullier/warvity/issues/8)
* add grenade fuse timer and explosion ([#27](https://github.com/ghoullier/warvity/issues/27)) ([63fd5e5](https://github.com/ghoullier/warvity/commit/63fd5e5eac91f4060028d6d841069d2489c750d0))
* add grenade with throw mechanics and surface bouncing ([#22](https://github.com/ghoullier/warvity/issues/22)) ([09acfba](https://github.com/ghoullier/warvity/commit/09acfbaee13a13d22cfaf6c63ea5678ecc2f9f25)), closes [#14](https://github.com/ghoullier/warvity/issues/14)
* add health points and worm death system ([#17](https://github.com/ghoullier/warvity/issues/17)) ([555b9ea](https://github.com/ghoullier/warvity/commit/555b9eaa15acbb4e62b409995421b47d33b74184))
* add HUD scene with timer, turn indicator and health bars ([#23](https://github.com/ghoullier/warvity/issues/23)) ([057f055](https://github.com/ghoullier/warvity/commit/057f05569d194a25948fd8023b78cc3ad3d6a16b)), closes [#7](https://github.com/ghoullier/warvity/issues/7)
* add turn countdown timer with auto-switch ([#20](https://github.com/ghoullier/warvity/issues/20)) ([0f42e76](https://github.com/ghoullier/warvity/commit/0f42e764d8fd210637d6d3d2f11a3a19f9369f99)), closes [#10](https://github.com/ghoullier/warvity/issues/10)
* bazooka explosion with terrain destruction and damage falloff ([#26](https://github.com/ghoullier/warvity/issues/26)) ([c4e0243](https://github.com/ghoullier/warvity/commit/c4e0243ce8bfa354e4f9612664e21e3a0cf15d8b)), closes [#13](https://github.com/ghoullier/warvity/issues/13)
* implement bazooka projectile with radial gravity ([#24](https://github.com/ghoullier/warvity/issues/24)) ([3117428](https://github.com/ghoullier/warvity/commit/31174288039e03e6e79f7337d3f7393d1968d522)), closes [#12](https://github.com/ghoullier/warvity/issues/12)
* implement TurnManager player alternation logic ([#18](https://github.com/ghoullier/warvity/issues/18)) ([5e61c9a](https://github.com/ghoullier/warvity/commit/5e61c9ad0da899d6f4f82c5fbfbd60c8bacde3ae)), closes [#9](https://github.com/ghoullier/warvity/issues/9)
* initial game skeleton with radial gravity and destructible terrain ([#1](https://github.com/ghoullier/warvity/issues/1)) ([1bb1293](https://github.com/ghoullier/warvity/commit/1bb1293dc595bf4579f5d70247cd912bbafa39da))


### Bug Fixes

* add planet outline for better visual clarity ([#29](https://github.com/ghoullier/warvity/issues/29)) ([f55be39](https://github.com/ghoullier/warvity/commit/f55be3964363196dd6dffc6d1fb06ddf48324481))

## 1.0.0 (2024-02-10)


### Features

* **ci:** configure release-please-config ([#35](https://github.com/ghoullier/bun-typescript-template/issues/35)) ([0b660a3](https://github.com/ghoullier/bun-typescript-template/commit/0b660a388fe2079dfb7b2505e62bca04dd36882b))
* reset version ([#40](https://github.com/ghoullier/bun-typescript-template/issues/40)) ([d369df8](https://github.com/ghoullier/bun-typescript-template/commit/d369df8dbb8faf999a0dca2606a3d097dfa042be))
* update bun types ([#39](https://github.com/ghoullier/bun-typescript-template/issues/39)) ([8b9f302](https://github.com/ghoullier/bun-typescript-template/commit/8b9f3027e757e86f418343054e272b018d987c87))


### Miscellaneous

* **ci:** migrate to node20 ([#34](https://github.com/ghoullier/bun-typescript-template/issues/34)) ([6cfc29b](https://github.com/ghoullier/bun-typescript-template/commit/6cfc29b638e3c44a8729dfcbc097f8f07528dade))
* **deps-dev:** bump @arethetypeswrong/cli from 0.13.2 to 0.13.3 ([#4](https://github.com/ghoullier/bun-typescript-template/issues/4)) ([39f6d67](https://github.com/ghoullier/bun-typescript-template/commit/39f6d671c5c8466710bcdc113b9190583ce0c103))
* **deps-dev:** bump @arethetypeswrong/cli from 0.13.3 to 0.13.4 ([#15](https://github.com/ghoullier/bun-typescript-template/issues/15)) ([de6c2b8](https://github.com/ghoullier/bun-typescript-template/commit/de6c2b8342cf4b0829b57503d3166e8076ed80c1))
* **deps-dev:** bump @arethetypeswrong/cli from 0.13.4 to 0.13.5 ([#16](https://github.com/ghoullier/bun-typescript-template/issues/16)) ([4b5302f](https://github.com/ghoullier/bun-typescript-template/commit/4b5302faf569f438015433ad66bd7cec96adbb45))
* **deps-dev:** bump @arethetypeswrong/cli from 0.13.5 to 0.13.6 ([#30](https://github.com/ghoullier/bun-typescript-template/issues/30)) ([0a04e3e](https://github.com/ghoullier/bun-typescript-template/commit/0a04e3e7070532d56e5df58496a942e76948b339))
* **deps-dev:** bump @arethetypeswrong/cli from 0.13.6 to 0.13.7 ([#36](https://github.com/ghoullier/bun-typescript-template/issues/36)) ([9de3fe7](https://github.com/ghoullier/bun-typescript-template/commit/9de3fe70fc3f9b0a723f914bacc44fdc53c2ea50))
* **deps-dev:** bump @arethetypeswrong/cli from 0.13.7 to 0.13.8 ([#38](https://github.com/ghoullier/bun-typescript-template/issues/38)) ([1ffa9ec](https://github.com/ghoullier/bun-typescript-template/commit/1ffa9ec06a3f6589137f9a886453a3f3e016053f))
* **deps-dev:** bump @tsconfig/strictest from 2.0.2 to 2.0.3 ([#37](https://github.com/ghoullier/bun-typescript-template/issues/37)) ([6bda4ae](https://github.com/ghoullier/bun-typescript-template/commit/6bda4aecee8fbc5d898572a991c72fb1ecc12ae3))
* **deps-dev:** bump bun-types from 1.0.14 to 1.0.15 ([#3](https://github.com/ghoullier/bun-typescript-template/issues/3)) ([d78417c](https://github.com/ghoullier/bun-typescript-template/commit/d78417cdc84a24c35101ccc94a2de5ab781d9fe8))
* **deps-dev:** bump bun-types from 1.0.15 to 1.0.16 ([#9](https://github.com/ghoullier/bun-typescript-template/issues/9)) ([19389a8](https://github.com/ghoullier/bun-typescript-template/commit/19389a8275f91e8e0124b09458f39689aa15714b))
* **deps-dev:** bump bun-types from 1.0.16 to 1.0.17 ([#11](https://github.com/ghoullier/bun-typescript-template/issues/11)) ([d79483d](https://github.com/ghoullier/bun-typescript-template/commit/d79483de642c6a5542efcb44f9084e8468116c79))
* **deps-dev:** bump bun-types from 1.0.17 to 1.0.18 ([#13](https://github.com/ghoullier/bun-typescript-template/issues/13)) ([46f6df6](https://github.com/ghoullier/bun-typescript-template/commit/46f6df6c9a6cb8867280b8808c47d0032e96166e))
* **deps-dev:** bump bun-types from 1.0.18 to 1.0.19 ([#17](https://github.com/ghoullier/bun-typescript-template/issues/17)) ([9382844](https://github.com/ghoullier/bun-typescript-template/commit/9382844a87de7602ddeb942125a2dfa215fe5e7d))
* **deps-dev:** bump bun-types from 1.0.19 to 1.0.20 ([#19](https://github.com/ghoullier/bun-typescript-template/issues/19)) ([3f6dfa6](https://github.com/ghoullier/bun-typescript-template/commit/3f6dfa63fcee3b269337d3a2a78a20de21fe5871))
* **deps-dev:** bump bun-types from 1.0.20 to 1.0.21 ([#22](https://github.com/ghoullier/bun-typescript-template/issues/22)) ([8c3c442](https://github.com/ghoullier/bun-typescript-template/commit/8c3c4421a0c4ba678dbc6afbdec11c8578f7375d))
* **deps-dev:** bump bun-types from 1.0.21 to 1.0.22 ([#25](https://github.com/ghoullier/bun-typescript-template/issues/25)) ([1ca2b3f](https://github.com/ghoullier/bun-typescript-template/commit/1ca2b3f0c32eebd82d08fc024edbf0f389c7a58a))
* **deps-dev:** bump bun-types from 1.0.22 to 1.0.23 ([#27](https://github.com/ghoullier/bun-typescript-template/issues/27)) ([0b64c5c](https://github.com/ghoullier/bun-typescript-template/commit/0b64c5c650410fa0fcb898b1d77026d2ca0c5b59))
* **deps-dev:** bump bun-types from 1.0.23 to 1.0.25 ([#29](https://github.com/ghoullier/bun-typescript-template/issues/29)) ([ed4cc08](https://github.com/ghoullier/bun-typescript-template/commit/ed4cc08222b73e1af9f372820071298506c25a53))
* **deps-dev:** bump bun-types from 1.0.25 to 1.0.26 ([#33](https://github.com/ghoullier/bun-typescript-template/issues/33)) ([72279f0](https://github.com/ghoullier/bun-typescript-template/commit/72279f0ddb496789fd431671345f94b8d67b6a73))
* **deps-dev:** bump publint from 0.2.6 to 0.2.7 ([#20](https://github.com/ghoullier/bun-typescript-template/issues/20)) ([023d800](https://github.com/ghoullier/bun-typescript-template/commit/023d8007ebd01b135f42de753b42f87648315af5))
* **deps-dev:** bump the eslint group with 2 updates ([#18](https://github.com/ghoullier/bun-typescript-template/issues/18)) ([4ea60f9](https://github.com/ghoullier/bun-typescript-template/commit/4ea60f99f696f7e7f9fd3dd799f9dcc03a5da5b2))
* **deps-dev:** bump the eslint group with 2 updates ([#21](https://github.com/ghoullier/bun-typescript-template/issues/21)) ([9a52ac1](https://github.com/ghoullier/bun-typescript-template/commit/9a52ac18c6d91e711eace13f1f90abeded842fbe))
* **deps-dev:** bump the eslint group with 2 updates ([#23](https://github.com/ghoullier/bun-typescript-template/issues/23)) ([9b70002](https://github.com/ghoullier/bun-typescript-template/commit/9b7000290bab4aca8527a98ab7c1967e5a733d78))
* **deps-dev:** bump the eslint group with 2 updates ([#24](https://github.com/ghoullier/bun-typescript-template/issues/24)) ([43e5a50](https://github.com/ghoullier/bun-typescript-template/commit/43e5a5045ddb6628c2233288c853534d165722df))
* **deps-dev:** bump the eslint group with 2 updates ([#26](https://github.com/ghoullier/bun-typescript-template/issues/26)) ([eb51e76](https://github.com/ghoullier/bun-typescript-template/commit/eb51e760980be496337693b9140245439d65dd93))
* **deps-dev:** bump the eslint group with 2 updates ([#28](https://github.com/ghoullier/bun-typescript-template/issues/28)) ([19f44a0](https://github.com/ghoullier/bun-typescript-template/commit/19f44a03b330e29b57a1e0408471e0e5391d010f))
* **deps-dev:** bump the eslint group with 2 updates ([#31](https://github.com/ghoullier/bun-typescript-template/issues/31)) ([8026f3f](https://github.com/ghoullier/bun-typescript-template/commit/8026f3fe0c7f811c82b69b2103553611c49164e1))
* **deps-dev:** bump the eslint group with 2 updates ([#32](https://github.com/ghoullier/bun-typescript-template/issues/32)) ([000e601](https://github.com/ghoullier/bun-typescript-template/commit/000e60175e40418d13f38a49872de2345050f8fb))
* **deps-dev:** bump the eslint group with 2 updates ([#8](https://github.com/ghoullier/bun-typescript-template/issues/8)) ([40e0eda](https://github.com/ghoullier/bun-typescript-template/commit/40e0eda5c325d2cf4e98c1bba554ad6910678010))
* **deps-dev:** bump the eslint group with 3 updates ([#14](https://github.com/ghoullier/bun-typescript-template/issues/14)) ([3d2d148](https://github.com/ghoullier/bun-typescript-template/commit/3d2d148d62c91e60d59cb3aa35fe26bc6fc90f23))
* **deps-dev:** bump the eslint group with 3 updates ([#2](https://github.com/ghoullier/bun-typescript-template/issues/2)) ([6234195](https://github.com/ghoullier/bun-typescript-template/commit/6234195313a2cfd716c9171f373137215178796d))
* **deps-dev:** bump typescript from 5.3.2 to 5.3.3 ([#7](https://github.com/ghoullier/bun-typescript-template/issues/7)) ([6e5c339](https://github.com/ghoullier/bun-typescript-template/commit/6e5c3391837c1ad1afe9e57373eb94163c8e9e30))
* improve readme with token section ([#6](https://github.com/ghoullier/bun-typescript-template/issues/6)) ([fa26433](https://github.com/ghoullier/bun-typescript-template/commit/fa2643342b74e8575e420a2f287282ed443fa96b))
* improve typechecking and dx ([#10](https://github.com/ghoullier/bun-typescript-template/issues/10)) ([6325785](https://github.com/ghoullier/bun-typescript-template/commit/63257855e56e40bf2f438f8dab3bb9d354c1148a))
* uniformize job names ([#12](https://github.com/ghoullier/bun-typescript-template/issues/12)) ([c86b05b](https://github.com/ghoullier/bun-typescript-template/commit/c86b05bd2596fd27eb824664cbbe4c5abb84963b))
