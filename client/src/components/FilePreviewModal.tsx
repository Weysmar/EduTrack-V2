import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { X, Download, AlertCircle } from 'lucide-react'

interface FilePreviewModalProps {
    isOpen: boolean
    onClose: () => void
    fileData: Blob | null
    fileName: string
    fileType: string
}

export function FilePreviewModal({ isOpen, onClose, fileData, fileName, fileType }: FilePreviewModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && fileData) {
            const url = URL.createObjectURL(fileData)
            setPreviewUrl(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [isOpen, fileData])

    if (!isOpen || !fileData) return null

    const isPdf = fileType === 'application/pdf'
    const isImage = fileType.startsWith('image/')

    // For now, rely on standard browser display capabilities
    const canPreview = isPdf || isImage

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-6xl h-[85vh] transform overflow-hidden rounded-2xl bg-card border shadow-xl transition-all flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 flex items-center gap-2">
                                        Viewing: {fileName}
                                    </Dialog.Title>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={previewUrl || '#'}
                                            download={fileName}
                                            className="p-2 hover:bg-muted rounded-full transition-colors"
                                            title="Download"
                                        >
                                            <Download className="h-5 w-5" />
                                        </a>
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-muted rounded-full transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-muted/20 relative overflow-hidden flex items-center justify-center p-4">
                                    {previewUrl && (
                                        <>
                                            {isPdf && (
                                                <iframe
                                                    src={previewUrl}
                                                    className="w-full h-full rounded-lg border"
                                                    title={fileName}
                                                />
                                            )}
                                            {isImage && (
                                                <img
                                                    src={previewUrl}
                                                    alt={fileName}
                                                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                                />
                                            )}
                                            {!canPreview && (
                                                <div className="text-center space-y-4">
                                                    <div className="p-4 bg-muted rounded-full inline-flex">
                                                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-xl font-semibold">Preview not available</h3>
                                                        <p className="text-muted-foreground">This file type ({fileType}) cannot be viewed in the browser.</p>
                                                    </div>
                                                    <a
                                                        href={previewUrl}
                                                        download={fileName}
                                                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                        Download File
                                                    </a>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
