import { Meta } from '@storybook/blocks';

import { CoreHelper } from '.';

<Meta title="Helpers/Core" />

# CoreHelper

This helpers expose some utilities methods, described below:

## getValueOrDefault

Return the value or when value is undefined return default value passed

#### Example

```
const res = CoreHelper.getValueOrDefault(undefined, 'defaultValue'); // res='defaultValue'
const res = CoreHelper.getValueOrDefault('example', 'defaultValue'); // res='example'
```

## getPropertyValue

Return the value of property name of an object

#### Example

```
const res = CoreHelper.getPropertyValue({a: 1, b: 2}, 'a'); // res=1
const res = CoreHelper.getPropertyValue({a: 1, b: 2}, 'c'); // res=undefined
const res = CoreHelper.getPropertyValue({a: 1, b: 2}, 'c', 3); // res=3
```
