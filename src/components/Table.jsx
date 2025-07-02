import { formatNumber } from "../helpers/largeNumberFormator";

export function Table({ tokens }) {
  return (
    <div className="gorb-card w-full max-w-xl mt-6">
      <h2 className="text-2xl font-bold text-gorb-green-dark dark:text-gorb-green mb-4">
        Previous Tokens
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full rounded-gorb overflow-hidden shadow bg-white dark:bg-gorb-bg-dark">
          <thead>
            <tr>
              <th className="bg-gorb-green-light dark:bg-gorb-green-dark text-gorb-accent dark:text-white font-semibold px-4 py-3">
                Name
              </th>
              <th className="bg-gorb-green-light dark:bg-gorb-green-dark text-gorb-accent dark:text-white font-semibold px-4 py-3">
                Symbol
              </th>
              <th className="bg-gorb-green-light dark:bg-gorb-green-dark text-gorb-accent dark:text-white font-semibold px-4 py-3">
                Decimal
              </th>
              <th className="bg-gorb-green-light dark:bg-gorb-green-dark text-gorb-accent dark:text-white font-semibold px-4 py-3">
                Network
              </th>
              <th className="bg-gorb-green-light dark:bg-gorb-green-dark text-gorb-accent dark:text-white font-semibold px-4 py-3">
                Total Supply
              </th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, index) => (
              <tr
                key={index}
                className="even:bg-gorb-green-light even:dark:bg-gorb-green-dark hover:bg-gorb-green hover:dark:bg-gorb-green-dark transition-colors"
              >
                <td className="px-4 py-3 text-gorb-accent dark:text-white">
                  {token.name}
                </td>
                <td className="px-4 py-3 text-gorb-accent dark:text-white">
                  {token.symbol}
                </td>
                <td className="px-4 py-3 text-gorb-accent dark:text-white">
                  {token.decimal}
                </td>
                <td className="px-4 py-3 text-gorb-accent dark:text-white">
                  {token.network}
                </td>
                <td className="px-4 py-3 text-gorb-accent dark:text-white">
                  {formatNumber(token.supply)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
