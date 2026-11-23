// Calls a TypeScript project makes, compiled against index.d.ts by typings.spec.mjs.
// A call marked @ts-expect-error must not compile: the SDK would fail on it at runtime.
import Gleap from '../index';

Gleap.setStyles('#1A73E8', '#0B57D0', '#1A73E8');
Gleap.setStyles('#1A73E8', '#0B57D0', '#1A73E8', '#FFFFFF', 12, 24, 24, 'BOTTOM_RIGHT', '#4285F4', '#8AB4F8');

// @ts-expect-error setStyles takes positional arguments; an object throws on the page and injects no styles.
Gleap.setStyles({ primaryColor: '#1A73E8', headerColor: '#0B57D0', buttonColor: '#1A73E8', backgroundColor: '#FFFFFF' });
