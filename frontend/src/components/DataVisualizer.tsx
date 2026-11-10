import type { FC } from 'react';

interface ChartItem {
  label?: string;
  category?: string;
  facility?: string;
  month?: string;
  value?: number;
  inquiries?: number;
  bedRate?: number;
  [key: string]: any;
}

interface TableRow {
  [key: string]: any;
}

export const DataVisualizer: FC<{ content: string }> = ({ content }) => {
  // Extract chart blocks: ```json:chart ... ```
  const chartMatch = content.match(/```json:chart\s*([\s\S]*?)```/);
  // Extract table blocks: ```json:table ... ```
  const tableMatch = content.match(/```json:table\s*([\s\S]*?)```/);

  let chartData: ChartItem[] | null = null;
  let tableData: TableRow[] | null = null;

  if (chartMatch) {
    try {
      chartData = JSON.parse(chartMatch[1]);
    } catch (e) {
      console.error('Failed to parse chart json', e);
    }
  }

  if (tableMatch) {
    try {
      tableData = JSON.parse(tableMatch[1]);
    } catch (e) {
      console.error('Failed to parse table json', e);
    }
  }

  // Remove the json blocks from text display
  const cleanedText = content
    .replace(/```json:chart[\s\S]*?```/g, '')
    .replace(/```json:table[\s\S]*?```/g, '')
    .trim();

  return (
    <div className="space-y-4">
      {/* Prose Text */}
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {cleanedText}
      </div>

      {/* Table Visualization */}
      {tableData && tableData.length > 0 && (
        <div className="my-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {Object.keys(tableData[0]).map((key) => (
                  <th key={key} className="px-4 py-2 font-semibold uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  {Object.entries(row).map(([key, val], cellIdx) => {
                    const isStatus = key.toLowerCase().includes('status');
                    return (
                      <td key={cellIdx} className="px-4 py-2.5 text-gray-700">
                        {isStatus ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              String(val).includes('APPROVED') || String(val).includes('OPTIMAL')
                                ? 'bg-emerald-100 text-emerald-800'
                                : String(val).includes('PENDING') || String(val).includes('PROCESS')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {String(val)}
                          </span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bar Chart Visualization */}
      {chartData && chartData.length > 0 && (
        <div className="my-4 rounded-lg border border-gray-200 bg-slate-50 p-4 shadow-sm">
          <div className="mb-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            📊 Data Distribution Chart
          </div>
          <div className="space-y-2">
            {(() => {
              const maxValue = Math.max(
                ...chartData.map((d) => d.value ?? d.inquiries ?? d.bedRate ?? 1)
              );
              return chartData.map((item, i) => {
                const label = item.label || item.category || item.facility || item.month || `Item ${i + 1}`;
                const val = item.value ?? item.inquiries ?? item.bedRate ?? 0;
                const percentage = Math.round((val / maxValue) * 100);

                return (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between pb-1 text-gray-600 font-medium">
                      <span>{label}</span>
                      <span className="font-semibold text-gray-900">
                        {typeof val === 'number' && val > 1000 ? `$${val.toLocaleString()}` : val}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
