// react-simple-wysiwyg reads a `placeholder` attribute at runtime via CSS
// `attr(placeholder)`, but its own types never declared the prop.
import 'react-simple-wysiwyg';

declare module 'react-simple-wysiwyg' {
    interface ContentEditableProps {
        placeholder?: string;
    }
}
