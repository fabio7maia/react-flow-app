## [2.6.2](https://github.com/fabio7maia/react-flow-app/compare/v2.6.1...v2.6.2) (2023-11-20)


### Bug Fixes

* fixed problem found in react-18 and refined github workflows ([2271a27](https://github.com/fabio7maia/react-flow-app/commit/2271a271dd3324eb4fd5e32ab86f1e2fecabba56))
* fixed release github workflow ([06e0f3d](https://github.com/fabio7maia/react-flow-app/commit/06e0f3d296d053f70bdecbc2664babb9c149356f))

## [2.6.1](https://github.com/fabio7maia/react-flow-app/compare/v2.6.0...v2.6.1) (2023-09-01)


### Bug Fixes

* fixed dependencies ([daa63a9](https://github.com/fabio7maia/react-flow-app/commit/daa63a929071d17f821fd27d71f2565f3e1c816e))
* fixed problem with listen prop is optional, but is required for code working ([8b78e5a](https://github.com/fabio7maia/react-flow-app/commit/8b78e5aeedd9d62bbf39e654a2014d84aa40c740))

# [2.6.0](https://github.com/fabio7maia/react-flow-app/compare/v2.5.0...v2.6.0) (2023-07-31)


### Features

* added listen prop in flow provider to allow more flexibility ([07ea09d](https://github.com/fabio7maia/react-flow-app/commit/07ea09d0fed7e7e97040f493e6cc8fff75ea062a))

# [2.5.0](https://github.com/fabio7maia/react-flow-app/compare/v2.4.0...v2.5.0) (2023-07-03)


### Features

* allow execute actions from current step or another screen steps (for cases when show modals or float blocks) ([5dd81af](https://github.com/fabio7maia/react-flow-app/commit/5dd81af2f6bc7e69ce41daa362e14d5e654bde62))

# [2.4.0](https://github.com/fabio7maia/react-flow-app/compare/v2.3.0...v2.4.0) (2023-06-22)


### Features

* added clearHistory method to useFlow hook ([bb6f819](https://github.com/fabio7maia/react-flow-app/commit/bb6f81966bdd903fdba2d5dd2960a8dd943e60df))

# [2.3.0](https://github.com/fabio7maia/react-flow-app/compare/v2.2.0...v2.3.0) (2023-05-30)


### Features

* added onFlowMount and onFlowUnmount handlers to fire when flows are mounted or unmounted ([4f64ce5](https://github.com/fabio7maia/react-flow-app/commit/4f64ce5f5714a4e1c75f24a9af4e7ce30d66ecd4))

# [2.2.0](https://github.com/fabio7maia/react-flow-app/compare/v2.1.3...v2.2.0) (2023-01-22)


### Features

* added custom template in children FlowProvider using StepRender component ([b619d7e](https://github.com/fabio7maia/react-flow-app/commit/b619d7e9190c64dfab26da02cc0b1db67f3f87cc))

## [2.1.3](https://github.com/fabio7maia/react-flow-app/compare/v2.1.2...v2.1.3) (2022-10-06)


### Bug Fixes

* fixed problem with use flow manager when used it without wrapped by context ([45877ad](https://github.com/fabio7maia/react-flow-app/commit/45877adf987d09e3a622ab22c97ef0efba0ce863))

## [2.1.2](https://github.com/fabio7maia/react-flow-app/compare/v2.1.1...v2.1.2) (2022-08-29)


### Bug Fixes

* fixed problem with window.history.replaceState when page is executed in file:// protocol ([5869cb7](https://github.com/fabio7maia/react-flow-app/commit/5869cb765d4073153df66b312d39710b87d3b444))

## [2.1.1](https://github.com/fabio7maia/react-flow-app/compare/v2.1.0...v2.1.1) (2022-08-01)


### Bug Fixes

* fixed problem with hasPreviousStep method because fromFlowName it's filled with current flow name ([77ddaf4](https://github.com/fabio7maia/react-flow-app/commit/77ddaf4067c5f4a5dd7dfc189bf149bea3fd3e8c))

# [2.1.0](https://github.com/fabio7maia/react-flow-app/compare/v2.0.1...v2.1.0) (2022-07-08)


### Features

* added initialStepName to FlowProvider to allow navigate to custom initial step ([7aa062e](https://github.com/fabio7maia/react-flow-app/commit/7aa062e856e103c128bc06b0d420e8b0dcd85617))

## [2.0.1](https://github.com/fabio7maia/react-flow-app/compare/v2.0.0...v2.0.1) (2022-06-17)


### Bug Fixes

* fixed not exists flow ([3b46e2a](https://github.com/fabio7maia/react-flow-app/commit/3b46e2a626945cb266c015264fba48fc8ad5060f))

# [2.0.0](https://github.com/fabio7maia/react-flow-app/compare/v1.8.3...v2.0.0) (2022-05-17)


* Merge pull request #28 from fabio7maia/feature/remove-react-router-dep ([e9882ba](https://github.com/fabio7maia/react-flow-app/commit/e9882ba332a7df939c792ece5738064db2395832)), closes [#28](https://github.com/fabio7maia/react-flow-app/issues/28)


### BREAKING CHANGES

* removed react router dep and refined Flow Manager props

## [1.8.3](https://github.com/fabio7maia/react-flow-app/compare/v1.8.2...v1.8.3) (2022-05-17)


### Performance Improvements

* removed react-router dependency ([20cdb6b](https://github.com/fabio7maia/react-flow-app/commit/20cdb6b79083f9e0ffb262bc97d9ecfe6a19e83b))

## [1.8.2](https://github.com/fabio7maia/react-flow-app/compare/v1.8.1...v1.8.2) (2022-04-29)


### Bug Fixes

* fixed problem with clear history in dispatch to forget passed from current flow and keep history correct ([ca322c7](https://github.com/fabio7maia/react-flow-app/commit/ca322c7f398d91a5c122d1e2752bb3ff4ab4f587))

## [1.8.1](https://github.com/fabio7maia/react-flow-app/compare/v1.8.0...v1.8.1) (2022-02-22)


### Bug Fixes

* fixed problem with getLastAction in useFlow ([58e2689](https://github.com/fabio7maia/react-flow-app/commit/58e2689409847827881d0a04a08f9ee827fdba6c))

# [1.8.0](https://github.com/fabio7maia/react-flow-app/compare/v1.7.1...v1.8.0) (2022-02-22)


### Features

* added get last action to use flow hook ([cbff5fe](https://github.com/fabio7maia/react-flow-app/commit/cbff5fecd06b498088c4f8024906391a285cf578))

## [1.7.1](https://github.com/fabio7maia/react-flow-app/compare/v1.7.0...v1.7.1) (2022-02-02)


### Bug Fixes

* fixed problems with navigations and clear history ([d8e88c9](https://github.com/fabio7maia/react-flow-app/commit/d8e88c969c6dcc2cea423632f1b0930c389e4cb3))

# [1.7.0](https://github.com/fabio7maia/react-flow-app/compare/v1.6.2...v1.7.0) (2021-12-28)


### Features

* refine package description ([fb6fc4c](https://github.com/fabio7maia/react-flow-app/commit/fb6fc4cef4d95fcb59f5a22249f6821c9a49e67a))

## [1.6.2](https://github.com/fabio7maia/react-flow-app/compare/v1.6.1...v1.6.2) (2021-12-28)


### Bug Fixes

* fixed navigations between flows when only not saved anything in history ([cde232d](https://github.com/fabio7maia/react-flow-app/commit/cde232d93d39e7f2c44441f073fc6ca7d960a8a3))

## [1.6.1](https://github.com/fabio7maia/react-flow-app/compare/v1.6.0...v1.6.1) (2021-12-28)


### Bug Fixes

* fixed data sent in listeners ([3291360](https://github.com/fabio7maia/react-flow-app/commit/329136082dd9833fa7945923bebd758f9c986bc6))

# [1.6.0](https://github.com/fabio7maia/react-flow-app/compare/v1.5.5...v1.6.0) (2021-12-28)


### Features

* added treatment to cyclic navigations and fix multiples mounts when exists cyclic navigations ([bd82cbd](https://github.com/fabio7maia/react-flow-app/commit/bd82cbd4e03bc729035f3c345f7326f51688913d))

## [1.5.5](https://github.com/fabio7maia/react-flow-app/compare/v1.5.4...v1.5.5) (2021-12-20)


### Bug Fixes

* fixed data sent in listeners ([a1acc07](https://github.com/fabio7maia/react-flow-app/commit/a1acc076d436bb560703f6c714d4427361866588))

## [1.5.4](https://github.com/fabio7maia/react-flow-app/compare/v1.5.3...v1.5.4) (2021-12-16)


### Bug Fixes

* fixed absolete methods of string ([d244b52](https://github.com/fabio7maia/react-flow-app/commit/d244b52ba4b52989c0090091dff04213d8e83739))
* fixed initial mount and saved last steps ([1090346](https://github.com/fabio7maia/react-flow-app/commit/1090346ee46578dc24670e7e27963a9b2dd84444))

## [1.5.3](https://github.com/fabio7maia/react-flow-app/compare/v1.5.2...v1.5.3) (2021-12-11)


### Bug Fixes

* fixed navigations between multiples flows ([057050d](https://github.com/fabio7maia/react-flow-app/commit/057050d90f8b7fff99e57beac736cdf49952b2d0))

## [1.5.2](https://github.com/fabio7maia/react-flow-app/compare/v1.5.1...v1.5.2) (2021-12-11)


### Bug Fixes

* fixed problem with multiple navigation between different flows ([766227e](https://github.com/fabio7maia/react-flow-app/commit/766227e9b3b2686064dff20221cbcbcc3dc15375))

## [1.5.1](https://github.com/fabio7maia/react-flow-app/compare/v1.5.0...v1.5.1) (2021-12-10)


### Bug Fixes

* added options to start method of flow manager model ([db4aaba](https://github.com/fabio7maia/react-flow-app/commit/db4aabac5c0c814ab27b428746b8c5ec7c3ac683))

# [1.5.0](https://github.com/fabio7maia/react-flow-app/compare/v1.4.0...v1.5.0) (2021-12-10)


### Features

* added options to flow start ([fe61890](https://github.com/fabio7maia/react-flow-app/commit/fe61890cb82e6361621cf2370ff6031925a4b90f))

# [1.4.0](https://github.com/fabio7maia/react-flow-app/compare/v1.3.0...v1.4.0) (2021-11-10)


### Features

* refined return when use callback in step navigation to allow clear history ([3b7c80a](https://github.com/fabio7maia/react-flow-app/commit/3b7c80aadc1c7a714044d2b8449892a7ac769a0e))

# [1.3.0](https://github.com/fabio7maia/react-flow-app/compare/v1.2.0...v1.3.0) (2021-11-04)


### Features

* disable logger before init and set default not logging ([c3f7987](https://github.com/fabio7maia/react-flow-app/commit/c3f7987520a7056a4294495314cc4ceb27937469))

# [1.2.0](https://github.com/fabio7maia/react-flow-app/compare/v1.1.3...v1.2.0) (2021-10-28)


### Features

* added initialStep to options of step and refined navigateTo method to allow optional stepName passed ([338c23b](https://github.com/fabio7maia/react-flow-app/commit/338c23b57e1ac3fbef0c2b862d34803532fd48cc))

## [1.1.3](https://github.com/fabio7maia/react-flow-app/compare/v1.1.2...v1.1.3) (2021-10-27)


### Bug Fixes

* fixed getCurrentStep, getPreviousStep and getHistory to return empty callback when not exists flow to working properly in tests ([ee7e7a9](https://github.com/fabio7maia/react-flow-app/commit/ee7e7a9c4d593e511de271b812791d0c359c526a))

## [1.1.2](https://github.com/fabio7maia/react-flow-app/compare/v1.1.1...v1.1.2) (2021-10-26)


### Bug Fixes

* fixed semantic release build ([e36833c](https://github.com/fabio7maia/react-flow-app/commit/e36833c7061a06e19ce4f2c7d600795f8789c9a5))

## [1.1.1](https://github.com/fabio7maia/react-flow-app/compare/v1.1.0...v1.1.1) (2021-10-26)


### Bug Fixes

* fixed sematic release ([b13de10](https://github.com/fabio7maia/react-flow-app/commit/b13de10b1e961a1802faef3c790783a7f21932e3))

# [1.1.0](https://github.com/fabio7maia/react-flow-app/compare/v1.0.5...v1.1.0) (2021-10-26)


### Features

* added getPreviousStep, getCurrentStep and getHistory functions to useFlow ([8fc69c7](https://github.com/fabio7maia/react-flow-app/commit/8fc69c7292bf50594b64caa8a617d2d3227e183e))

## [1.0.5](https://github.com/fabio7maia/react-flow-app/compare/v1.0.4...v1.0.5) (2021-10-26)


### Bug Fixes

* fixed problems with routing ([5e6819e](https://github.com/fabio7maia/react-flow-app/commit/5e6819e7eeeb5cbe92d2f4e2eeb3e9dcfabab3fe))

## [1.0.4](https://github.com/fabio7maia/react-flow-app/compare/v1.0.3...v1.0.4) (2021-10-22)


### Bug Fixes

* refine sematic release ([8212f51](https://github.com/fabio7maia/react-flow-app/commit/8212f516355404d13f42780cc5190add08f208aa))

## [1.0.3](https://github.com/fabio7maia/react-flow-app/compare/v1.0.2...v1.0.3) (2021-10-21)


### Bug Fixes

* fixed problem with router in ssr and fixed loader screen ([989d81b](https://github.com/fabio7maia/react-flow-app/commit/989d81bbbf9628f6d038882f5ce13966dcd87e7d))

## [1.0.2](https://github.com/fabio7maia/react-flow-app/compare/v1.0.1...v1.0.2) (2021-10-21)


### Bug Fixes

* refined paths alias ([12fe35c](https://github.com/fabio7maia/react-flow-app/commit/12fe35c50881826a17f7b598f43f2a04dcfff592))

## [1.0.1](https://github.com/fabio7maia/react-flow-app/compare/v1.0.0...v1.0.1) (2021-10-21)


### Bug Fixes

* fixed problem with alias path in imports ([fe5485c](https://github.com/fabio7maia/react-flow-app/commit/fe5485c3d7795d77ebf79ec5d138de73349c4ab8))

# 1.0.0 (2021-10-20)


### Bug Fixes

* disable npm publish ([2716a49](https://github.com/fabio7maia/react-flow-app/commit/2716a492e3006ca64e70ebe8d7163db4e844418e))
* fixed build and publish ([c99f619](https://github.com/fabio7maia/react-flow-app/commit/c99f6190f750456f5c9da7ab46a439e9a10a5871))
* fixed code in addWatcher method of flow model ([8497b75](https://github.com/fabio7maia/react-flow-app/commit/8497b754666356037880a81f5e69d08cbe4f1a72))
* fixed problem with script build and release github action ([94d5149](https://github.com/fabio7maia/react-flow-app/commit/94d5149bc8d48483cbf257acc8672952a6ee8f5e))
* fixed repository url ([03befcb](https://github.com/fabio7maia/react-flow-app/commit/03befcb8c35066023bc2dc9f7798343ff6f0353b))
* only disable publish package ([01062a3](https://github.com/fabio7maia/react-flow-app/commit/01062a3bd92687e8d5ecc5eb74476b675d1733df))
* refined publish files ([48e2a4e](https://github.com/fabio7maia/react-flow-app/commit/48e2a4e1bc6390007b2813359f99103fb6283d33))
* removed commit msg husky ([56da3b6](https://github.com/fabio7maia/react-flow-app/commit/56da3b6573536bc45f923361ce73cf3530b0a1e8))
* removed priate property in package.json ([d0bd9c4](https://github.com/fabio7maia/react-flow-app/commit/d0bd9c4f1e4165dee348deacf11f8c35931aee5c))
* removed publish npm package ([c212955](https://github.com/fabio7maia/react-flow-app/commit/c212955389f4116c31972ea0c7878bda75a80f97))
* removed semantic release github ([069d42f](https://github.com/fabio7maia/react-flow-app/commit/069d42fac0b789d833b021b9ac78452098b6a9ed))
* set public package ([e493d33](https://github.com/fabio7maia/react-flow-app/commit/e493d33990c159b415df7b3b0320485d0fb37d1c))
* tried fix release ([7e24625](https://github.com/fabio7maia/react-flow-app/commit/7e24625e9d7717535f3f91f95674f0dc24c9f8fc))


### Features

* activate npm publish ([0cbd27e](https://github.com/fabio7maia/react-flow-app/commit/0cbd27e28837eafa8157572f26ef2de715331cec))
* activate publish github release ([cd36443](https://github.com/fabio7maia/react-flow-app/commit/cd36443cc04babaa95ba23637e22a0882ba0c3fb))
* activated commit msg husky ([cd7673d](https://github.com/fabio7maia/react-flow-app/commit/cd7673d7c2e9381128a39cd5ebb8ca7b5f8625c1))
* added build to pre-push husky hook to prevent errors ([31dc763](https://github.com/fabio7maia/react-flow-app/commit/31dc76334124de4b7c7ad79a385349fae3bf7858))
* added github action to deploy storybook to github pages ([e7f5398](https://github.com/fabio7maia/react-flow-app/commit/e7f53983c89c0e7ea21182cf49a35aba7e879b9d))
* added logger helper and useLogger hook ([bf3551d](https://github.com/fabio7maia/react-flow-app/commit/bf3551d702082b38c977dba06166f895d0cab478))
* Added support for routes ([db28119](https://github.com/fabio7maia/react-flow-app/commit/db28119b3c25f12bdbc90da079caded4e96ed0b7))
* changed publish config to public scope ([effa3cc](https://github.com/fabio7maia/react-flow-app/commit/effa3cce89b21fd5d8a01afae58ae515adce798f))
* changed repo url ([88da6f8](https://github.com/fabio7maia/react-flow-app/commit/88da6f850b28c0ad05b914c929e7305fb08518f4))
* improved watchers and add support to navigate between flows ([3b6cbc2](https://github.com/fabio7maia/react-flow-app/commit/3b6cbc26bbc6ddd81974b3f36708e38389b805ea))
* initial sources ([6429aeb](https://github.com/fabio7maia/react-flow-app/commit/6429aeb30a39322926e53bf963141ceee2c6b834))
* initial sources ([91c78f6](https://github.com/fabio7maia/react-flow-app/commit/91c78f6876818e60a4ed0853989d8b69e97efbc8))
* initial sources (fix github actions) ([47e5764](https://github.com/fabio7maia/react-flow-app/commit/47e57642ec9891c841dcdec0551dfa1aab1a791e))
* refine release build ([d6b31fb](https://github.com/fabio7maia/react-flow-app/commit/d6b31fbb0ffba2c69aed5c17d58721587e472d72))
* refine semantic release for github ([7f5150d](https://github.com/fabio7maia/react-flow-app/commit/7f5150da3559d0862eb2fbc65f06bbb34bbf1486))
* refined license ([c1b1a68](https://github.com/fabio7maia/react-flow-app/commit/c1b1a68180e36ddd33659d7af313774ae828bc17))
* refined package name ([a66f945](https://github.com/fabio7maia/react-flow-app/commit/a66f945416c28f590f88993bc617bc33b147b847))
* refined package.json description, author and repo url ([bd9bab7](https://github.com/fabio7maia/react-flow-app/commit/bd9bab7354df7deda1e92e9cec94045fa82370ef))
* refined semantic release github ([50dee39](https://github.com/fabio7maia/react-flow-app/commit/50dee39f081bf590aedcd2d5a13bebd87a03beff))
* renamed doAction to dispatch, added watchers and added stories with flow examples ([79a18d6](https://github.com/fabio7maia/react-flow-app/commit/79a18d61e55b4bb0e0ed2cd31cc205e98411c66e))
