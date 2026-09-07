declare module 'bpmn-js/lib/NavigatedViewer' {
    export default class BpmnNavigatedViewer {
        constructor(options?: {
            container?: HTMLElement | string | null;
            width?: string | number;
            height?: string | number;
            keyboard?: { bindTo?: HTMLElement | Document };
            [key: string]: any;
        });

        importXML(xml: string): Promise<{ warnings: string[] }>;
        saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
        saveSVG(): Promise<{ svg: string }>;
        get<T = any>(serviceName: string): T;
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
        destroy(): void;
        clear(): void;
    }
}

declare module 'bpmn-js' {
    import BpmnNavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
    export default BpmnNavigatedViewer;
}
