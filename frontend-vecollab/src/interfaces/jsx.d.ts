// @types/react 19 no longer declares a global `JSX` namespace; it only exports
// `JSX` from the `react` module (nested as `React.JSX`). This restores the
// global namespace so existing `JSX.Element` annotations keep working.
import type { JSX as ReactJSX } from 'react';

declare global {
    namespace JSX {
        type Element = ReactJSX.Element;
        type ElementClass = ReactJSX.ElementClass;
        type ElementType = ReactJSX.ElementType;
        interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
        interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
        interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
        interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
        interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
        type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
    }
}

export {};
