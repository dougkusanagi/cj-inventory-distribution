import {
    Camera,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Info,
    ImagePlus,
    Pencil,
    Star,
    Trash2,
    Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import {
    canvasToImageFile,
    PhotoEditor,
} from '@/components/products/product-photo-modals';
import type { PhotoEditorSource } from '@/components/products/product-photo-modals';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

const MAX_IMAGES = 5;
const MAX_SOURCE_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2400;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ExistingPhotoItem = {
    key: string;
    kind: 'existing';
    id: number;
    url: string;
    thumbUrl: string;
    name: string;
    removed: boolean;
    error?: string;
};

type NewPhotoItem = {
    key: string;
    kind: 'new';
    id: string;
    file: File;
    previewUrl: string;
    name: string;
    origin: 'camera' | 'gallery';
    replacesMediaId?: number;
    removed: boolean;
    error?: string;
};

export type PhotoItem = ExistingPhotoItem | NewPhotoItem;

type PendingPhoto = {
    file: File;
    origin: 'camera' | 'gallery';
};

type PhotoState = {
    items: PhotoItem[];
    error: string | null;
};

export type PhotoChange = {
    files: File[];
    imageOrder: string[];
    removeMediaIds: number[];
};

type PhotoManagerProps = {
    value: File[];
    existingImages: ProductImage[];
    error?: string;
    errors?: Record<string, string>;
    onChange: (change: PhotoChange) => void;
    onProcessingChange?: (processing: boolean) => void;
};

type PhotoAction =
    | { type: 'hydrate'; items: PhotoItem[] }
    | { type: 'add'; items: NewPhotoItem[] }
    | { type: 'replace'; key: string; item: PhotoItem }
    | { type: 'move'; key: string; direction: -1 | 1 }
    | { type: 'setCover'; key: string }
    | { type: 'remove'; key: string }
    | { type: 'undoRemove'; key: string }
    | { type: 'setError'; key?: string; message: string | null };

function photoReducer(state: PhotoState, action: PhotoAction): PhotoState {
    switch (action.type) {
        case 'hydrate':
            return { items: action.items, error: null };
        case 'add':
            return { items: [...state.items, ...action.items], error: null };
        case 'replace': {
            const itemIndex = state.items.findIndex(
                (item) => item.key === action.key,
            );

            if (itemIndex === -1) {
                return state;
            }

            const items = [...state.items];
            items[itemIndex] = action.item;

            return { items, error: null };
        }
        case 'move':
            return {
                ...state,
                items: moveActiveItem(
                    state.items,
                    action.key,
                    action.direction,
                ),
            };
        case 'setCover':
            return {
                ...state,
                items: moveActiveItemToCover(state.items, action.key),
            };
        case 'remove':
            return {
                ...state,
                items: state.items.map((item) =>
                    item.key === action.key ? { ...item, removed: true } : item,
                ),
            };
        case 'undoRemove':
            return {
                ...state,
                items: state.items.map((item) =>
                    item.key === action.key
                        ? { ...item, removed: false, error: undefined }
                        : item,
                ),
            };
        case 'setError':
            if (!action.key) {
                return { ...state, error: action.message };
            }

            return {
                ...state,
                items: state.items.map((item) =>
                    item.key === action.key
                        ? { ...item, error: action.message ?? undefined }
                        : item,
                ),
            };
    }
}

function createInitialPhotoState({
    existingImages,
    value,
    objectUrls,
}: {
    existingImages: ProductImage[];
    value: File[];
    objectUrls: Set<string>;
}): PhotoState {
    const items = [
        ...existingImages.map((image): ExistingPhotoItem => ({
            key: existingPhotoKey(image.id),
            kind: 'existing',
            id: image.id,
            url: image.url,
            thumbUrl: image.thumb_url ?? image.url,
            name: image.name,
            removed: false,
        })),
        ...value.map((file): NewPhotoItem => ({
            key: newPhotoKey(),
            kind: 'new',
            id: createPhotoId(),
            file,
            previewUrl: createObjectUrl(file, objectUrls),
            name: file.name,
            origin: 'gallery',
            removed: false,
        })),
    ];

    return photoReducer({ items: [], error: null }, { type: 'hydrate', items });
}

function moveActiveItem(
    items: PhotoItem[],
    key: string,
    direction: -1 | 1,
): PhotoItem[] {
    const currentItems = items.filter((item) => !item.removed);
    const currentIndex = currentItems.findIndex((item) => item.key === key);
    const targetIndex = currentIndex + direction;

    if (
        currentIndex === -1 ||
        targetIndex < 0 ||
        targetIndex >= currentItems.length
    ) {
        return items;
    }

    [currentItems[currentIndex], currentItems[targetIndex]] = [
        currentItems[targetIndex],
        currentItems[currentIndex],
    ];

    return replaceActiveItems(items, currentItems);
}

function moveActiveItemToCover(items: PhotoItem[], key: string): PhotoItem[] {
    const currentItems = items.filter((item) => !item.removed);
    const currentIndex = currentItems.findIndex((item) => item.key === key);

    if (currentIndex <= 0) {
        return items;
    }

    const selectedItem = currentItems.splice(currentIndex, 1)[0];
    currentItems.unshift(selectedItem);

    return replaceActiveItems(items, currentItems);
}

function replaceActiveItems(
    items: PhotoItem[],
    currentItems: PhotoItem[],
): PhotoItem[] {
    let activeIndex = 0;

    return items.map((item) => {
        if (item.removed) {
            return item;
        }

        return currentItems[activeIndex++];
    });
}

function serializePhotos(items: PhotoItem[]): PhotoChange {
    const currentItems = items.filter((item) => !item.removed);
    const newItems = currentItems.filter(
        (item): item is NewPhotoItem => item.kind === 'new',
    );
    const newIndexByKey = new Map(
        newItems.map((item, index) => [item.key, index]),
    );
    const removeMediaIds = items.flatMap((item) => {
        if (item.kind === 'existing' && item.removed) {
            return [item.id];
        }

        if (item.kind === 'new' && item.replacesMediaId !== undefined) {
            return [item.replacesMediaId];
        }

        return [];
    });

    return {
        files: newItems.map((item) => item.file),
        imageOrder: currentItems.flatMap((item) => {
            if (item.kind === 'existing') {
                return ['media:' + item.id];
            }

            const index = newIndexByKey.get(item.key);

            return index === undefined ? [] : ['new:' + index];
        }),
        removeMediaIds: [...new Set(removeMediaIds)],
    };
}

function existingPhotoKey(id: number): string {
    return 'media:' + id;
}

function newPhotoKey(): string {
    return 'new:' + createPhotoId();
}

function createPhotoId(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        '-' +
        Math.random().toString(36).slice(2) +
        '-' +
        Math.random().toString(36).slice(2)
    );
}

function createObjectUrl(file: File, objectUrls: Set<string>): string {
    if (
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
    ) {
        return '';
    }

    const url = URL.createObjectURL(file);
    objectUrls.add(url);

    return url;
}

export function ProductPhotoManager({
    value,
    existingImages,
    error,
    errors = {},
    onChange,
    onProcessingChange,
}: PhotoManagerProps) {
    const isMobile = useIsMobile();
    const [objectUrls] = useState<Set<string>>(() => new Set());
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const onChangeRef = useRef(onChange);
    const [state, dispatch] = useReducer(
        photoReducer,
        {
            existingImages,
            value,
            objectUrls,
        },
        createInitialPhotoState,
    );
    const [pickerOpen, setPickerOpen] = useState(false);
    const [organizerOpen, setOrganizerOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState<PhotoItem | null>(null);
    const [editor, setEditor] = useState<{
        source: PhotoEditorSource;
        queueProgress?: {
            current: number;
            total: number;
        };
        targetKey?: string;
        targetMediaId?: number;
    } | null>(null);
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [processing, setProcessing] = useState(false);
    const [announcement, setAnnouncement] = useState('');

    const currentItems = state.items.filter((item) => !item.removed);
    const serverImageErrors = useMemo(() => {
        const newItems = currentItems.filter(
            (item): item is NewPhotoItem => item.kind === 'new',
        );

        return new Map(
            newItems
                .map((item, index) => [item.key, errors['images.' + index]])
                .filter((entry): entry is [string, string] =>
                    Boolean(entry[1]),
                ),
        );
    }, [currentItems, errors]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onChangeRef.current(serializePhotos(state.items));
    }, [state.items]);

    useEffect(() => {
        onProcessingChange?.(processing);
    }, [onProcessingChange, processing]);

    useEffect(() => {
        const currentObjectUrls = new Set(
            state.items
                .filter((item): item is NewPhotoItem => item.kind === 'new')
                .map((item) => item.previewUrl),
        );

        if (editor?.source.url.startsWith('blob:')) {
            currentObjectUrls.add(editor.source.url);
        }

        objectUrls.forEach((url) => {
            if (currentObjectUrls.has(url)) {
                return;
            }

            URL.revokeObjectURL(url);
            objectUrls.delete(url);
        });
    }, [editor, objectUrls, state.items]);

    useEffect(() => {
        const urls = objectUrls;

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, [objectUrls]);

    const handleFileChange = async (
        event: ChangeEvent<HTMLInputElement>,
        origin: 'camera' | 'gallery',
    ) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';

        if (files.length === 0 || processing) {
            return;
        }

        const isRetake = editor !== null;
        const filesToProcess = isRetake
            ? files.slice(0, 1)
            : files.slice(0, Math.max(0, MAX_IMAGES - currentItems.length));

        if (!isRetake && filesToProcess.length === 0) {
            dispatch({
                type: 'setError',
                message: 'Você já adicionou o limite de 5 fotos.',
            });

            return;
        }

        const truncated = !isRetake && files.length > filesToProcess.length;

        if (
            !validateSelectedFiles(filesToProcess, truncated) ||
            filesToProcess.length === 0
        ) {
            dispatch({
                type: 'setError',
                message: getSelectedFilesError(filesToProcess, truncated),
            });

            return;
        }

        setProcessing(true);

        try {
            const preparedFiles = await Promise.all(
                filesToProcess.map((file) => resizeImageForUpload(file)),
            );

            if (isRetake) {
                const preparedFile = preparedFiles[0];
                const previewUrl = createObjectUrl(preparedFile, objectUrls);

                setEditor((currentEditor) => ({
                    targetKey: currentEditor?.targetKey,
                    targetMediaId: currentEditor?.targetMediaId,
                    queueProgress: currentEditor?.queueProgress,
                    source: {
                        url: previewUrl,
                        name: preparedFile.name,
                        origin,
                    },
                }));
                dispatch({ type: 'setError', message: null });

                return;
            }

            const [firstFile, ...remainingFiles] = preparedFiles;

            setPendingPhotos(remainingFiles.map((file) => ({ file, origin })));
            setEditor({
                queueProgress:
                    preparedFiles.length > 1
                        ? { current: 1, total: preparedFiles.length }
                        : undefined,
                source: {
                    url: createObjectUrl(firstFile, objectUrls),
                    name: firstFile.name,
                    origin,
                },
            });
            dispatch({ type: 'setError', message: null });
            setAnnouncement(
                preparedFiles.length === 1
                    ? 'Foto pronta para ajustar.'
                    : 'Foto pronta para ajustar. As próximas serão abertas em seguida.',
            );
        } catch {
            dispatch({
                type: 'setError',
                message:
                    'Não foi possível preparar uma das fotos. Tente outra imagem.',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleAddFromCamera = (event: ChangeEvent<HTMLInputElement>) =>
        void handleFileChange(event, 'camera');

    const handleAddFromGallery = (event: ChangeEvent<HTMLInputElement>) =>
        void handleFileChange(event, 'gallery');

    const handleApplyEditedPhoto = async (editedFile: File) => {
        if (!editor) {
            return;
        }

        setProcessing(true);

        try {
            const editedItem: NewPhotoItem = {
                key: editor.targetKey ?? newPhotoKey(),
                kind: 'new',
                id: createPhotoId(),
                file: editedFile,
                previewUrl: createObjectUrl(editedFile, objectUrls),
                name: editedFile.name,
                origin:
                    editor.source.origin === 'camera' ? 'camera' : 'gallery',
                replacesMediaId: editor.targetMediaId,
                removed: false,
            };

            if (editor.targetKey) {
                dispatch({
                    type: 'replace',
                    key: editor.targetKey,
                    item: editedItem,
                });
            } else {
                dispatch({ type: 'add', items: [editedItem] });
            }

            const [nextPhoto, ...remainingPhotos] = pendingPhotos;

            setPendingPhotos(remainingPhotos);

            if (nextPhoto) {
                setEditor({
                    queueProgress: editor.queueProgress
                        ? {
                              current: editor.queueProgress.current + 1,
                              total: editor.queueProgress.total,
                          }
                        : undefined,
                    source: {
                        url: createObjectUrl(nextPhoto.file, objectUrls),
                        name: nextPhoto.file.name,
                        origin: nextPhoto.origin,
                    },
                });
                setAnnouncement('Foto adicionada. Ajuste a próxima foto.');
            } else {
                setEditor(null);
                setAnnouncement('Foto adicionada.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleEdit = (item: PhotoItem) => {
        const source: PhotoEditorSource = {
            url: item.kind === 'existing' ? item.url : item.previewUrl,
            name: item.name,
            origin: item.kind === 'existing' ? 'existing' : item.origin,
        };

        setEditor({
            source,
            targetKey: item.key,
            targetMediaId:
                item.kind === 'existing' ? item.id : item.replacesMediaId,
        });
        setAnnouncement('Ajuste a foto selecionada.');
    };

    const handleCancelEditor = () => {
        setEditor(null);
        setPendingPhotos([]);
        setAnnouncement(
            editor?.targetKey
                ? 'Ajuste cancelado. A foto original foi mantida.'
                : 'Adição de fotos cancelada.',
        );
    };

    const handleSetCover = (item: PhotoItem) => {
        const index = currentItems.findIndex(
            (currentItem) => currentItem.key === item.key,
        );

        if (index <= 0) {
            return;
        }

        dispatch({ type: 'setCover', key: item.key });
        setAnnouncement('Foto ' + (index + 1) + ' definida como capa.');
    };

    const handleMove = (item: PhotoItem, direction: -1 | 1) => {
        const index = currentItems.findIndex(
            (currentItem) => currentItem.key === item.key,
        );
        const nextIndex = index + direction;

        if (index < 0 || nextIndex < 0 || nextIndex >= currentItems.length) {
            return;
        }

        dispatch({ type: 'move', key: item.key, direction });
        setAnnouncement('Foto movida para a posição ' + (nextIndex + 1) + '.');
    };

    const handleRemove = (item: PhotoItem) => {
        const index = currentItems.findIndex(
            (currentItem) => currentItem.key === item.key,
        );

        if (index < 0) {
            return;
        }

        dispatch({ type: 'remove', key: item.key });
        setAnnouncement(
            index === 0 && currentItems.length > 1
                ? 'Foto removida. Foto 2 agora é a capa.'
                : 'Foto removida. Você pode desfazer antes de salvar.',
        );
    };

    const handleUndoRemove = (item: PhotoItem) => {
        dispatch({ type: 'undoRemove', key: item.key });
        setAnnouncement(
            item.kind === 'existing'
                ? 'Foto restaurada.'
                : 'Foto adicionada novamente.',
        );
    };

    const inputError = state.error ?? error;

    return (
        <section
            className="grid gap-4"
            aria-labelledby="product-photos-title"
            aria-invalid={inputError ? true : undefined}
            tabIndex={inputError ? -1 : undefined}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                        <h3
                            id="product-photos-title"
                            className="text-sm font-semibold text-foreground"
                        >
                            Fotos do produto
                        </h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {currentItems.length}/{MAX_IMAGES}
                        </span>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                        A primeira foto é a capa e aparece no catálogo.
                    </p>
                </div>
                <div className="grid w-full gap-2 sm:w-auto">
                    <Button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        disabled={
                            currentItems.length >= MAX_IMAGES || processing
                        }
                        className="h-12 w-full"
                    >
                        <ImagePlus />
                        Adicionar fotos
                    </Button>
                </div>
            </div>

            {state.items.length === 0 ? (
                <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={processing}
                    className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ImagePlus className="size-5" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                        Adicione fotos da peça
                    </span>
                    <span className="text-xs text-muted-foreground">
                        JPG, PNG ou WebP · a foto será otimizada antes de salvar
                    </span>
                </button>
            ) : (
                <div className="grid gap-3">
                    {currentItems.length >= 2 && (
                        <div className="flex justify-center sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOrganizerOpen(true)}
                                disabled={processing}
                                className="h-10 w-full rounded-xl px-3 text-xs sm:w-auto"
                            >
                                <GripVertical />
                                Organizar fotos
                            </Button>
                        </div>
                    )}
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                        <Info className="size-3.5" />
                        Toque em uma foto para ampliar ou ajustar.
                    </p>
                    <div className="grid grid-cols-2 gap-0 sm:grid-cols-1 sm:gap-3">
                        {state.items.map((item) => {
                            if (item.removed) {
                                return (
                                    <div
                                        key={item.key}
                                        className="col-span-full flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                                <Undo2 className="size-5" />
                                            </div>
                                            <div className="grid min-w-0 gap-0.5">
                                                <p className="text-sm font-semibold text-foreground">
                                                    Foto removida
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    A remoção só será aplicada
                                                    ao salvar.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                handleUndoRemove(item)
                                            }
                                            disabled={processing}
                                            className="h-12 shrink-0 px-3"
                                        >
                                            <Undo2 />
                                            Desfazer
                                        </Button>
                                    </div>
                                );
                            }

                            const index = currentItems.findIndex(
                                (currentItem) => currentItem.key === item.key,
                            );

                            return (
                                <PhotoRow
                                    key={item.key}
                                    item={item}
                                    index={index}
                                    error={
                                        item.error ??
                                        serverImageErrors.get(item.key)
                                    }
                                    processing={processing}
                                    onPreview={() => setPreviewItem(item)}
                                    onEdit={() => handleEdit(item)}
                                    onSetCover={() => handleSetCover(item)}
                                    onRemove={() => handleRemove(item)}
                                />
                            );
                        })}
                        {currentItems.length % 2 === 1 && (
                            <div
                                aria-hidden="true"
                                className={cn(
                                    'border-l border-border sm:hidden',
                                    currentItems.length > 2 && 'border-t',
                                )}
                            />
                        )}
                    </div>
                </div>
            )}

            <InputError
                message={inputError}
                role={inputError ? 'alert' : undefined}
            />
            <p role="status" aria-live="polite" className="sr-only">
                {announcement}
            </p>

            <input
                ref={cameraInputRef}
                id="product-images-camera"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                capture="environment"
                className="sr-only"
                onChange={handleAddFromCamera}
                disabled={processing}
            />
            <input
                ref={galleryInputRef}
                id="product-images-gallery"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                multiple
                className="sr-only"
                onChange={handleAddFromGallery}
                disabled={processing}
            />

            <PhotoSourcePicker
                open={pickerOpen}
                isMobile={isMobile}
                onOpenChange={setPickerOpen}
                onCamera={() => {
                    setPickerOpen(false);
                    cameraInputRef.current?.click();
                }}
                onGallery={() => {
                    setPickerOpen(false);
                    galleryInputRef.current?.click();
                }}
            />

            <PhotoOrganizer
                open={organizerOpen}
                isMobile={isMobile}
                items={currentItems}
                onOpenChange={setOrganizerOpen}
                onMove={handleMove}
            />

            {editor && (
                <PhotoEditor
                    key={editor.source.url}
                    source={editor.source}
                    queueProgress={editor.queueProgress}
                    onCancel={handleCancelEditor}
                    onApply={handleApplyEditedPhoto}
                    onRetake={
                        editor.source.origin === 'camera'
                            ? () => cameraInputRef.current?.click()
                            : undefined
                    }
                />
            )}

            {previewItem && (
                <PhotoPreview
                    item={previewItem}
                    onOpenChange={(open) => !open && setPreviewItem(null)}
                />
            )}
        </section>
    );
}

function PhotoRow({
    item,
    index,
    error,
    processing,
    onPreview,
    onEdit,
    onSetCover,
    onRemove,
}: {
    item: PhotoItem;
    index: number;
    error?: string;
    processing: boolean;
    onPreview: () => void;
    onEdit: () => void;
    onSetCover: () => void;
    onRemove: () => void;
}) {
    const imageUrl = item.kind === 'existing' ? item.thumbUrl : item.previewUrl;

    return (
        <article
            className={cn(
                'grid min-w-0 content-start gap-2 bg-transparent p-2 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-center sm:gap-3 sm:rounded-2xl sm:border sm:p-3',
                index % 2 === 1 && 'border-l border-border',
                index >= 2 && 'border-t border-border',
                index === 0
                    ? 'sm:border-primary/50 sm:bg-primary/[0.03]'
                    : 'sm:border-border sm:bg-background',
            )}
        >
            <div className="relative w-full sm:w-20">
                <button
                    type="button"
                    onClick={onPreview}
                    className={cn(
                        'group relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                        index === 0 && 'ring-1 ring-primary/70 sm:ring-0',
                    )}
                    aria-label={`Ampliar ${index === 0 ? 'a capa' : 'a foto ' + (index + 1)}`}
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                            <ImagePlus className="size-5" />
                        </div>
                    )}
                    <span className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/15" />
                    {index === 0 && (
                        <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-md bg-background/65 px-1 py-1 text-[9px] font-bold tracking-[0.08em] text-foreground uppercase backdrop-blur-sm">
                            <Star className="size-3 text-primary" />
                            Capa
                        </span>
                    )}
                </button>
                {index > 0 && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={onSetCover}
                        disabled={processing}
                        className="absolute right-2 bottom-2 size-8 rounded-full border-primary text-primary shadow-sm backdrop-blur hover:bg-primary/10"
                        aria-label={`Definir a foto ${index + 1} como capa`}
                    >
                        <Star className="size-4" />
                    </Button>
                )}
                {item.kind === 'new' && (
                    <span className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                        Nova
                    </span>
                )}
            </div>

            <div className="grid min-w-0 gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onEdit}
                    disabled={processing}
                    className="h-10 w-full min-w-0 justify-start px-2 text-[11px] sm:h-12 sm:px-3 sm:text-sm"
                >
                    <Pencil />
                    Ajustar
                </Button>

                <Button
                    type="button"
                    variant="destructive"
                    onClick={onRemove}
                    disabled={processing}
                    className="h-9 w-full min-w-0 justify-start px-2 text-[11px] sm:h-10 sm:px-3 sm:text-sm"
                >
                    <Trash2 className="size-4" />
                    Remover
                </Button>

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </article>
    );
}

function PhotoPreview({
    item,
    onOpenChange,
}: {
    item: PhotoItem;
    onOpenChange: (open: boolean) => void;
}) {
    const imageUrl = item.kind === 'existing' ? item.url : item.previewUrl;
    const [zoom, setZoom] = useState(1);

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-1rem)] max-w-3xl gap-3 overflow-hidden p-3 sm:w-[calc(100%-2rem)] sm:p-4">
                <DialogHeader className="sr-only">
                    <DialogTitle>Visualizar foto do produto</DialogTitle>
                    <DialogDescription>
                        Foto ampliada do produto.
                    </DialogDescription>
                </DialogHeader>
                <div
                    className="flex max-h-[72dvh] min-h-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5"
                    onWheel={(event) => {
                        event.preventDefault();
                        setZoom((currentZoom) =>
                            Math.min(
                                4,
                                Math.max(
                                    1,
                                    currentZoom +
                                        (event.deltaY < 0 ? 0.1 : -0.1),
                                ),
                            ),
                        );
                    }}
                >
                    <img
                        src={imageUrl}
                        alt={item.name || 'Foto do produto'}
                        className="mx-auto block max-h-[72dvh] w-full object-contain transition-transform duration-150"
                        style={{ transform: `scale(${zoom})` }}
                    />
                </div>
                <div className="grid gap-2">
                    <label
                        htmlFor="product-photo-preview-zoom"
                        className="text-sm font-medium"
                    >
                        Aproximar foto
                    </label>
                    <input
                        id="product-photo-preview-zoom"
                        type="range"
                        min="1"
                        max="4"
                        step="0.01"
                        value={zoom}
                        onChange={(event) =>
                            setZoom(Number(event.target.value))
                        }
                        className="h-12 w-full accent-primary"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PhotoSourcePicker({
    open,
    isMobile,
    onOpenChange,
    onCamera,
    onGallery,
}: {
    open: boolean;
    isMobile: boolean;
    onOpenChange: (open: boolean) => void;
    onCamera: () => void;
    onGallery: () => void;
}) {
    const content = (
        <div className="grid gap-3">
            <Button
                type="button"
                variant="outline"
                onClick={onCamera}
                className="h-14 justify-start px-4 text-base"
            >
                <Camera />
                Tirar foto
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={onGallery}
                className="h-14 justify-start px-4 text-base"
            >
                <ImagePlus />
                Escolher da galeria
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Adicionar fotos</DrawerTitle>
                        <DrawerDescription>
                            Escolha como quer adicionar uma foto do produto.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-6 pb-8">{content}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Adicionar fotos</DialogTitle>
                    <DialogDescription>
                        Escolha como quer adicionar uma foto do produto.
                    </DialogDescription>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}

function PhotoOrganizer({
    open,
    isMobile,
    items,
    onOpenChange,
    onMove,
}: {
    open: boolean;
    isMobile: boolean;
    items: PhotoItem[];
    onOpenChange: (open: boolean) => void;
    onMove: (item: PhotoItem, direction: -1 | 1) => void;
}) {
    const content = (
        <div className="grid min-h-0 gap-3">
            {items.map((item, index) => {
                const imageUrl =
                    item.kind === 'existing' ? item.thumbUrl : item.previewUrl;

                return (
                    <div
                        key={item.key}
                        className="grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-2.5"
                    >
                        <div className="aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                            {imageUrl && (
                                <img
                                    src={imageUrl}
                                    alt=""
                                    className="size-full object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {index === 0
                                    ? '1 · CAPA'
                                    : 'Foto ' + (index + 1)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {item.name || 'Imagem do produto'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onMove(item, -1)}
                                disabled={index === 0}
                                className="size-12 px-0"
                                aria-label={
                                    index === 0
                                        ? 'Subir foto'
                                        : 'Subir foto ' + (index + 1)
                                }
                            >
                                <ChevronUp />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onMove(item, 1)}
                                disabled={index === items.length - 1}
                                className="size-12 px-0"
                                aria-label={'Descer foto ' + (index + 1)}
                            >
                                <ChevronDown />
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const footer = (
        <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full"
        >
            Pronto
        </Button>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none">
                    <DrawerHeader>
                        <DrawerTitle>Organizar fotos</DrawerTitle>
                        <DrawerDescription>
                            A primeira foto será a capa. Use subir e descer para
                            ordenar.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                        {content}
                    </div>
                    <div className="border-t border-border p-6 pt-4">
                        {footer}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Organizar fotos</DialogTitle>
                    <DialogDescription>
                        A primeira foto será a capa. Use subir e descer para
                        ordenar.
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 overflow-y-auto">{content}</div>
                {footer}
            </DialogContent>
        </Dialog>
    );
}

function validateSelectedFiles(files: File[], truncated: boolean): boolean {
    return (
        files.length > 0 &&
        !truncated &&
        files.every(
            (file) =>
                ACCEPTED_IMAGE_TYPES.includes(file.type) &&
                file.size <= MAX_SOURCE_IMAGE_SIZE_BYTES,
        )
    );
}

function getSelectedFilesError(files: File[], truncated: boolean): string {
    const invalidType = files.find(
        (file) => !ACCEPTED_IMAGE_TYPES.includes(file.type),
    );

    if (invalidType) {
        return invalidType.name + ': use JPG, PNG ou WebP.';
    }

    const tooLarge = files.find(
        (file) => file.size > MAX_SOURCE_IMAGE_SIZE_BYTES,
    );

    if (tooLarge) {
        return tooLarge.name + ': cada foto deve ter no máximo 25 MB.';
    }

    return truncated
        ? 'Selecione somente as vagas restantes para adicionar fotos.'
        : 'Você pode adicionar até 5 fotos por produto.';
}

async function resizeImageForUpload(file: File): Promise<File> {
    const image = await loadImage(file);
    const scale = Math.min(
        1,
        MAX_IMAGE_DIMENSION / image.width,
        MAX_IMAGE_DIMENSION / image.height,
    );

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');

    if (!context) {
        image.close?.();

        return file;
    }

    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
    image.close?.();

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'produto';
    const optimizedFile = await canvasToImageFile(canvas, baseName, 0.9);

    if (!optimizedFile) {
        return file;
    }

    return optimizedFile;
}

async function loadImage(file: File): Promise<{
    source: CanvasImageSource;
    width: number;
    height: number;
    close?: () => void;
}> {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);

        return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            close: () => bitmap.close(),
        };
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () =>
                reject(new Error('Não foi possível ler a imagem.'));
            element.src = objectUrl;
        });

        return {
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
        };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}
