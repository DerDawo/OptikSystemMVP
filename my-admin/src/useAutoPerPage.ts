import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const DEFAULT_MIN_PER_PAGE = 3;

export const useAutoPerPage = () => {
    const containerRef = useRef<HTMLElement | null>(null);
    const [perPage, setPerPage] = useState(DEFAULT_MIN_PER_PAGE);

    const computePerPage = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const listHeader = container.querySelector<HTMLElement>('.RaList-title');
        const listToolbar = container.querySelector<HTMLElement>('.RaList-toolbar');
        const pagination = container.querySelector<HTMLElement>('.MuiTablePagination-root, .RaPagination-root');
        const firstRow = container.querySelector<HTMLTableRowElement>('tbody tr');

        const headerHeight = (listHeader?.offsetHeight ?? 0) + (listToolbar?.offsetHeight ?? 0);
        const paginationHeight = pagination?.offsetHeight ?? 0;
        const rowHeight = firstRow?.offsetHeight ?? 52;

        const available = Math.max(0, container.clientHeight - headerHeight - paginationHeight);
        setPerPage(Math.max(DEFAULT_MIN_PER_PAGE, Math.floor(available / rowHeight)));
    }, []);

    useLayoutEffect(() => {
        computePerPage();
        const observer = new ResizeObserver(computePerPage);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            observer.disconnect();
        };
    }, [computePerPage]);

    return { perPage, containerRef };
};
