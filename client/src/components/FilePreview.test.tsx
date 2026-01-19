import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilePreview } from './FilePreview'

// Mock heic2any usually requires Worker
vi.mock('heic2any', () => ({
    default: vi.fn(),
}))

// Mock react-pdf modules to avoid canvas/worker issues in tests
vi.mock('react-pdf', () => ({
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
    Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Page: () => <div>PDF Page</div>,
}))

describe('FilePreview', () => {
    it('renders correctly for PDF', () => {
        // Note: PDF rendering is async and mocked, but the label should appear
        render(<FilePreview fileName="test.pdf" url="http://example.com/test.pdf" />)
        expect(screen.getByText('PDF')).toBeInTheDocument()
    })

    it('renders correctly for Text file', () => {
        render(<FilePreview fileName="notes.txt" />)
        expect(screen.getByText('TXT')).toBeInTheDocument()
    })

    it('renders correctly for Image', () => {
        render(<FilePreview fileName="image.png" url="http://example.com/image.png" showThumbnails={false} />)
        expect(screen.getByText('PNG')).toBeInTheDocument()
    })
})
