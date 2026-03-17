import { FunctionField, FunctionFieldProps } from 'react-admin';

const formatCurrency = (value: unknown): string => {
    if (value === undefined || value === null || value === '') {
        return '';
    }

    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) {
        return '';
    }

    return n.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + ' €';
};

export const CurrencyField = ({ source = 'Betrag', ...props }: FunctionFieldProps) => (
    <FunctionField
        {...props}
        source={source}
        render={record => {
            if (!record) {
                return '';
            }
            return formatCurrency(record[source as string]);
        }}
    />
);
