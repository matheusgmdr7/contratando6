"use client"

const DashboardPage = () => {
  return (
    <div className="container mx-auto p-2 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Card 1 */}
        <div className="bg-white shadow rounded-lg p-3 md:p-4">
          <h2 className="text-base md:text-lg lg:text-xl font-semibold mb-2">Card Title 1</h2>
          <p className="text-sm md:text-base">Some content for card 1.</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white shadow rounded-lg p-3 md:p-4">
          <h2 className="text-base md:text-lg lg:text-xl font-semibold mb-2">Card Title 2</h2>
          <p className="text-sm md:text-base">Some content for card 2.</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white shadow rounded-lg p-3 md:p-4">
          <h2 className="text-base md:text-lg lg:text-xl font-semibold mb-2">Card Title 3</h2>
          <p className="text-sm md:text-base">Some content for card 3.</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white shadow rounded-lg p-3 md:p-4">
          <h2 className="text-base md:text-lg lg:text-xl font-semibold mb-2">Card Title 4</h2>
          <p className="text-sm md:text-base">Some content for card 4.</p>
        </div>
      </div>

      <div className="mt-6 md:mt-8">
        <h2 className="text-lg md:text-xl font-semibold mb-2">Table Example</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead>
              <tr>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm">Header 1</th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm">Header 2</th>
                <th className="px-2 md:px-4 py-2 text-xs md:text-sm">Header 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 md:px-4 py-2 text-xs md:text-sm">Data 1</td>
                <td className="border px-2 md:px-4 py-2 text-xs md:text-sm">Data 2</td>
                <td className="border px-2 md:px-4 py-2 text-xs md:text-sm">Data 3</td>
              </tr>
              <tr>
                <td className="border px-2 md:px-4 py-2 text-xs md:text-sm">Data 4</td>
                <td className="border px-2 md:px-4 py-2 text-xs md:text-sm">Data 5</td>
                <td className="border px-2 md:px-4 py-2 text-xs md:text-sm">Data 6</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 md:mt-8">
        <h2 className="text-lg md:text-xl font-semibold mb-2">Chart Example</h2>
        <p className="text-sm md:text-base">Placeholder for a chart component.</p>
      </div>
    </div>
  )
}

export default DashboardPage
