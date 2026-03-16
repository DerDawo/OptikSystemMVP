import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const DEFAULT_MIN_PER_PAGE = 3;

export const useAutoPerPage = () => {
    const containerRef = useRef<HTMLElement | null>(null);
    const [perPage, setPerPage] = useState(0); // start with 0 until measurement is done

    const computePerPage = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        console.log(container)
        const actions = container.querySelector<HTMLElement>('.RaList-actions');
        const pagination = container.querySelector<HTMLElement>('.MuiTablePagination-root, .RaPagination-root');
        const listHeader = container.querySelector<HTMLElement>('.MuiTableHead-root, .RaDataTable-thead');
        const firstRow = container.querySelector<HTMLTableRowElement>('tbody tr');

        const headerHeight = (listHeader?.offsetHeight ?? 0) + (actions?.offsetHeight ?? 0);
        const paginationHeight = pagination?.offsetHeight ?? 0;
        const rowHeight = firstRow?.offsetHeight ?? 52;

        const available = Math.max(0, container.clientHeight - headerHeight - paginationHeight);
        console.log(Math.floor(available / rowHeight));
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
