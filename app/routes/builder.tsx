import { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { usePuterStore } from '~/lib/puter';
import { useReactToPrint } from 'react-to-print';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Undo,
    Redo,
    Download,
    ArrowLeft,
} from 'lucide-react';
import { useBuilderStore } from '~/lib/builderStore';

/* ─── Custom Font Size Extension ─── */
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }: any) => {
                return chain().setMark('textStyle', { fontSize }).run();
            },
            unsetFontSize: () => ({ chain }: any) => {
                return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
            },
        } as any;
    },
});

/* ─── Toolbar Button ─── */
const ToolBtn = ({
    onClick,
    active,
    disabled,
    title,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-30 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

/* ─── Divider ─── */
const Divider = () => <div className="w-px h-6 bg-gray-300 mx-1 shrink-0" />;

/* ─── Menu Bar ─── */
const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 bg-white border-b border-gray-200 justify-center">
            {/* Undo / Redo */}
            <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                <Undo size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                <Redo size={16} />
            </ToolBtn>

            <Divider />

            {/* Headings */}
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
                <Heading1 size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                <Heading2 size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                <Heading3 size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Normal text">
                <span className="text-xs font-semibold px-1">P</span>
            </ToolBtn>

            <Divider />

            {/* Formatting */}
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                <Bold size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                <Italic size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                <UnderlineIcon size={16} />
            </ToolBtn>

            <select
                className="text-sm border-gray-300 rounded mx-1 px-1 py-1 cursor-pointer bg-gray-50 hover:bg-gray-100"
                onChange={(e) => {
                    if (e.target.value === 'default') {
                        (editor.chain().focus() as any).unsetFontSize().run();
                    } else {
                        (editor.chain().focus() as any).setFontSize(e.target.value).run();
                    }
                }}
                value={editor.getAttributes('textStyle').fontSize || 'default'}
                title="Font Size"
            >
                <option value="default">Size</option>
                <option value="8pt">8</option>
                <option value="9pt">9</option>
                <option value="10pt">10</option>
                <option value="11pt">11</option>
                <option value="12pt">12</option>
                <option value="14pt">14</option>
                <option value="18pt">18</option>
                <option value="24pt">24</option>
                <option value="36pt">36</option>
            </select>

            <input
                type="color"
                onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                value={editor.getAttributes('textStyle').color || '#000000'}
                className="!w-6 !h-6 !p-0 !border-0 !rounded cursor-pointer shrink-0 !shadow-none !backdrop-filter-none ml-1"
                title="Text Color"
            />

            <Divider />

            {/* Alignment */}
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
                <AlignLeft size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
                <AlignCenter size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
                <AlignRight size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
                <AlignJustify size={16} />
            </ToolBtn>

            <Divider />

            {/* Lists */}
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                <List size={16} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
                <ListOrdered size={16} />
            </ToolBtn>
        </div>
    );
};

/* ─── Main Builder Page ─── */
const Builder = () => {
    const printRef = useRef<HTMLDivElement>(null);
    const { docHTML, setDocHTML } = useBuilderStore();
    const { auth, isLoading } = usePuterStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isAuthenticated && auth.role === 'recruiter') {
            navigate('/recruiter');
        }
    }, [auth.isAuthenticated, auth.role, navigate]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
            FontSize,
        ],
        content: docHTML || `
            <h1 style="text-align: center">YOUR NAME HERE</h1>
            <p style="text-align: center">city, state | email@example.com | 555-555-5555 | linkedin.com/in/name</p>
            <p></p>
            <h2>SUMMARY</h2>
            <hr>
            <p>A highly motivated professional looking to transition into a new role...</p>
            <p></p>
            <h2>EXPERIENCE</h2>
            <hr>
            <p><strong>Company Name</strong> - City, State</p>
            <p><em>Job Title</em> (Jan 2020 - Present)</p>
            <ul>
                <li>Led cross-functional teams to deliver 5 major projects on time.</li>
                <li>Increased revenue by 15% through strategic optimizations.</li>
            </ul>
        `,
        editorProps: {
            attributes: {
                class: 'builder-canvas',
                id: 'printable-resume-canvas',
            },
        },
        onUpdate({ editor: e }) {
            setDocHTML(e.getHTML());
        },
    });

    // Track the docHTML that was loaded on mount
    const initialDocRef = useRef(docHTML);

    // When docHTML changes externally (e.g. from "Fix in Editor" on Review page),
    // reload the editor content to show the user's actual resume, not old cached content.
    useEffect(() => {
        if (editor && docHTML && docHTML !== initialDocRef.current) {
            editor.commands.setContent(docHTML);
            initialDocRef.current = docHTML;
        }
    }, [editor, docHTML]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'Resume',
        pageStyle: `
            @page { size: A4; margin: 0; }
            @media print {
                body { -webkit-print-color-adjust: exact; background: white; }
                .builder-canvas { box-shadow: none !important; }
            }
        `,
    });

    const triggerPrint = () => {
        const el = document.getElementById('printable-resume-canvas');
        if (el) {
            // Point the ref to the editor's outer wrapper
            (printRef as any).current = el.closest('.tiptap') ? el : el.parentElement;
            handlePrint();
        }
    };

    return (
        <div className="builder-page">
            {/* ── Top Bar ── */}
            <header className="builder-topbar">
                <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeft size={18} />
                    <span className="font-semibold text-sm">Back</span>
                </Link>

                <span className="text-lg font-bold tracking-tight text-gray-800">Resume Editor</span>

                <button
                    type="button"
                    onClick={triggerPrint}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                    <Download size={16} />
                    Download PDF
                </button>
            </header>

            {/* ── Formatting Toolbar ── */}
            <MenuBar editor={editor} />

            {/* ── Document Canvas Area ── */}
            <div className="builder-scroll-area">
                <div ref={printRef}>
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* ── Scoped Styles ── */}
            <style>{`
                /* === Page Layout === */
                .builder-page {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow: hidden;
                    background: #e8eaed;
                }
                .builder-page main { min-height: unset; padding-top: 0; }

                .builder-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 24px;
                    background: #fff;
                    border-bottom: 1px solid #dadce0;
                    z-index: 20;
                    flex-shrink: 0;
                }

                .builder-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    justify-content: center;
                    padding: 40px 20px;
                }

                /* === TipTap Canvas — Google Docs A4 page look === */
                .builder-canvas {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    background: #fff;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06);
                    font-family: "Times New Roman", Times, serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: #000;
                    outline: none;
                    cursor: text;
                    border-radius: 2px;
                }

                /* 
                 * CRITICAL: Reset ALL global styles that bleed into TipTap.
                 * The global app.css sets h1 to text-gradient (transparent!),
                 * h2 to specific colors, input to have inset shadows, etc.
                 * We must override all of those inside the canvas.
                 */
                .builder-canvas h1 {
                    font-size: 24pt;
                    font-weight: 700;
                    line-height: 1.3;
                    margin: 0.5rem 0;
                    color: #000 !important;
                    background: none !important;
                    -webkit-background-clip: unset !important;
                    background-clip: unset !important;
                    -webkit-text-fill-color: #000 !important;
                }

                .builder-canvas h2 {
                    font-size: 16pt;
                    font-weight: 700;
                    line-height: 1.3;
                    margin: 1rem 0 0.4rem 0;
                    color: #000 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }

                .builder-canvas h3 {
                    font-size: 13pt;
                    font-weight: 600;
                    line-height: 1.3;
                    margin: 0.8rem 0 0.3rem 0;
                    color: #000 !important;
                }

                .builder-canvas p {
                    margin: 0.15rem 0;
                }

                .builder-canvas ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 0.3rem 0;
                }
                .builder-canvas ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin: 0.3rem 0;
                }
                .builder-canvas li {
                    margin: 0.1rem 0;
                }
                .builder-canvas li p {
                    margin: 0;
                }

                .builder-canvas hr {
                    border: none;
                    border-top: 1.5px solid #333;
                    margin: 0.25rem 0 0.6rem 0;
                }

                /* Placeholder text */
                .builder-canvas p.is-editor-empty:first-child::before {
                    content: "Start typing your resume here...";
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }

                /* Remove any prose classes that might interfere */
                .ProseMirror {
                    outline: none !important;
                }

                /* Color picker override: remove global input styles */
                .builder-topbar input[type="color"],
                .builder-page input[type="color"] {
                    box-shadow: none !important;
                    backdrop-filter: none !important;
                    border-radius: 4px !important;
                    padding: 0 !important;
                    background: transparent !important;
                }
            `}</style>
        </div>
    );
};

export default Builder;
