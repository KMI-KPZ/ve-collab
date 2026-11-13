import { useTranslation } from 'next-i18next';
import { KeyboardEvent, MouseEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdEdit, MdFormatClear, MdInsertLink, MdLinkOff } from 'react-icons/md';
import {
    BtnBold,
    BtnBulletList,
    BtnItalic,
    BtnNumberedList,
    BtnUnderline,
    Editor,
    EditorProvider,
    Toolbar,
    createButton,
} from 'react-simple-wysiwyg';
import Dialog from '../profile/Dialog';
import { sanitizedText } from './sanitizedText';

/**
 * whether the html of the editor shows no text at all, e.g. `<p></p>` or `<br>`
 */
export const isEmptyRichText = (html: string): boolean =>
    html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;| /g, '')
        .trim() === '';

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    showToolbar?: boolean;
    autoFocus?: boolean;
    onFocus?: () => void;
    minHeight?: string; // of the editable area, defaults to the one of the editor library
    actions?: ReactNode; // rendered at the end of the toolbar row, e.g. a send button
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder,
    showToolbar = true,
    autoFocus = false,
    onFocus,
    minHeight,
    actions,
}: Props) {
    const { t } = useTranslation(['community', 'common']);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState<boolean>(false);
    const [selectedLinkText, setSelectedLinkText] = useState<
        | {
              parentNode: Node;
              selectionStart: number;
              selectionEnd: number;
          }
        | undefined
    >();
    const [cursorInLink, setCursorInLink] = useState<false | HTMLAnchorElement>(false);

    useEffect(() => {
        if (!autoFocus) return;
        (wrapperRef.current?.querySelector('.rsw-ce') as HTMLElement | null)?.focus();
    }, [autoFocus]);

    const BtnClearFormatting = createButton(
        t('clear_formatting'),
        <MdFormatClear className="m-auto" />,
        'removeFormat'
    );

    const BtnLink = createButton(
        cursorInLink ? t('remove_link') : t('create_link'),
        cursorInLink ? <MdLinkOff className="m-auto" /> : <MdInsertLink className="m-auto" />,
        function ({ $selection }) {
            if ($selection?.nodeName === 'A') {
                if (window.getSelection()?.getRangeAt(0).toString() == '') {
                    window.getSelection()?.selectAllChildren($selection as Node);
                }
                document.execCommand('unlink');
                setCursorInLink(false);
            } else if ($selection) {
                setSelectedLinkText({
                    parentNode: window.getSelection()?.focusNode as Node,
                    selectionStart: window.getSelection()?.anchorOffset as number,
                    selectionEnd: window.getSelection()?.focusOffset as number,
                });
                setIsLinkDialogOpen(true);
            }
        }
    );

    const closeLinkDialog = () => {
        setIsLinkDialogOpen(false);
        setSelectedLinkText(undefined);
    };

    // the dialog is no form of its own, since the editor is usually part of one
    const applyLink = () => {
        const url = linkInputRef.current?.value ?? '';
        if (!url.startsWith('http')) return;

        if (cursorInLink !== false) {
            // update the existing link. Changing the DOM directly doesn't
            // trigger the editor's onChange, so hand the result over manually
            cursorInLink.href = url;
            const editable = wrapperRef.current?.querySelector('.rsw-ce');
            if (editable) onChange(sanitizedText(editable.innerHTML));
        } else if (selectedLinkText !== undefined) {
            // create a new link in the selected range
            const range = new Range();
            range.setStart(selectedLinkText.parentNode, selectedLinkText.selectionStart);
            range.setEnd(selectedLinkText.parentNode, selectedLinkText.selectionEnd);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.execCommand('createLink', false, url);
        }

        closeLinkDialog();
    };

    const onLinkInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        // don't submit the surrounding form
        event.preventDefault();
        applyLink();
    };

    const openLinkEditor = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!cursorInLink) return;

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(cursorInLink);
        selection?.removeAllRanges();
        selection?.addRange(range);

        setIsLinkDialogOpen(true);
    };

    const editorCaretChanged = () => {
        const parent = window.getSelection()?.focusNode?.parentNode;
        setCursorInLink(parent?.nodeName === 'A' ? (parent as HTMLAnchorElement) : false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {isLinkDialogOpen &&
                createPortal(
                    <Dialog isOpen={true} title={t('link')} onClose={closeLinkDialog}>
                        <div>
                            <input
                                ref={linkInputRef}
                                type="url"
                                name="url"
                                defaultValue={cursorInLink ? cursorInLink.href : ''}
                                onKeyDown={onLinkInputKeyDown}
                                autoComplete="off"
                                autoFocus
                                className="mr-2 p-2 border border-[#cccccc] rounded-md invalid:border-red-500"
                            />
                            <button
                                type="button"
                                onClick={applyLink}
                                className="my-2 py-2 px-5 rounded-lg bg-ve-collab-orange text-white cursor-pointer"
                            >
                                {t('common:ok')}
                            </button>
                        </div>
                    </Dialog>,
                    document.body
                )}

            {/* link tooltip  */}
            {cursorInLink && (
                <div
                    style={{
                        left: `${cursorInLink.offsetLeft - cursorInLink.offsetWidth / 2}px`,
                        top: `${2 + cursorInLink.offsetHeight + cursorInLink.offsetTop}px`,
                    }}
                    className={`absolute z-10 p-2 rounded-md bg-white shadow-sm border border-gray-200 text-ve-collab-blue after:content-[' '] after:absolute after:bottom-full after:left-1/2 after:-ml-2 after:border-4 after:border-transparent after:border-b-gray-300`}
                >
                    <a
                        href={cursorInLink.getAttribute('href') as string}
                        className="hover:underline"
                        title={t('open_link')}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {cursorInLink.getAttribute('href') as string}
                    </a>
                    <button
                        type="button"
                        onClick={(e) => openLinkEditor(e)}
                        className="cursor-pointer"
                        title={t('edit_link')}
                    >
                        <MdEdit className="ml-2" />
                    </button>
                </div>
            )}

            <EditorProvider>
                <Editor
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(sanitizedText(e.target.value))}
                    onKeyUp={editorCaretChanged}
                    onClick={editorCaretChanged}
                    onFocus={() => onFocus?.()}
                    containerProps={minHeight ? { style: { minHeight } } : undefined}
                />
                {(showToolbar || actions) && (
                    <div className="flex items-center">
                        {showToolbar && (
                            <Toolbar>
                                <BtnBold />
                                <BtnItalic />
                                <BtnUnderline />
                                <BtnBulletList style={{ paddingLeft: '5px' }} />
                                <BtnNumberedList style={{ paddingLeft: '5px' }} />
                                <BtnLink />
                                <BtnClearFormatting />
                            </Toolbar>
                        )}
                        {actions && <div className="ml-auto pl-2 pt-1">{actions}</div>}
                    </div>
                )}
            </EditorProvider>
        </div>
    );
}
