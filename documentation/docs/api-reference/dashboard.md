 ---
 sidebar_position: 5
 ---
 
 # Dashboard API
 
 Analytics and reporting API endpoints for the admin dashboard.
 
 ## Overview
 
 The Dashboard API provides endpoints for retrieving analytics data, statistics, and reports for business insights.
 
 ## Authentication
 
 All dashboard endpoints require authentication with admin privileges.
 
 ```http
 Authorization: Bearer <admin-token>
 ```
 
 ## Get Dashboard Overview
 
 Retrieve overview statistics for the dashboard homepage.
 
 ```http
 GET /api/dashboard/overview
 Authorization: Bearer <token>
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "revenue": {
       "total": 1250000,
       "thisMonth": 450000,
       "lastMonth": 380000,
       "growth": 18.4
     },
     "orders": {
       "total": 1523,
       "pending": 45,
       "processing": 23,
       "completed": 1432,
       "cancelled": 23
     },
     "products": {
       "total": 234,
       "inStock": 198,
       "lowStock": 18,
       "outOfStock": 18
     },
     "customers": {
       "total": 892,
       "new": 45,
       "active": 234
     }
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function getDashboardOverview(token) {
   const response = await fetch('http://localhost:5000/api/dashboard/overview', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   
   const result = await response.json();
   return result.data;
 }
 
 // Usage
 const overview = await getDashboardOverview(adminToken);
 console.log('Total revenue:', overview.revenue.total);
 console.log('Pending orders:', overview.orders.pending);
 ```
 
 ## Get Revenue Analytics
 
 Retrieve detailed revenue analytics with date range filtering.
 
 ```http
 GET /api/dashboard/revenue?startDate=2024-01-01&endDate=2024-01-31&interval=day
 Authorization: Bearer <token>
 ```
 
 ### Query Parameters
 
 | Parameter | Type | Default | Description |
 |-----------|------|---------|-------------|
 | `startDate` | string | 30 days ago | Start date (YYYY-MM-DD) |
 | `endDate` | string | today | End date (YYYY-MM-DD) |
 | `interval` | string | day | Group by: day, week, month |
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "summary": {
       "total": 450000,
       "average": 14516,
       "highest": 35000,
       "lowest": 5200
     },
     "timeseries": [
       {
         "date": "2024-01-01",
         "revenue": 15000,
         "orders": 12,
         "averageOrderValue": 1250
       },
       {
         "date": "2024-01-02",
         "revenue": 18500,
         "orders": 15,
         "averageOrderValue": 1233
       }
     ]
   }
 }
 ```
 
 ### Chart Integration Example
 
 ```tsx
 import { Line } from 'react-chartjs-2';
 
 function RevenueChart() {
   const [data, setData] = useState(null);
 
   useEffect(() => {
     async function fetchRevenue() {
       const response = await fetch(
         '/api/dashboard/revenue?' +
         'startDate=2024-01-01&endDate=2024-01-31&interval=day',
         {
           headers: { 'Authorization': `Bearer ${token}` }
         }
       );
       const result = await response.json();
       setData(result.data);
     }
 
     fetchRevenue();
   }, []);
 
   if (!data) return <div>Loading...</div>;
 
   const chartData = {
     labels: data.timeseries.map(d => d.date),
     datasets: [
       {
         label: 'Revenue',
         data: data.timeseries.map(d => d.revenue),
         borderColor: 'rgb(75, 192, 192)',
         tension: 0.1
       }
     ]
   };
 
   return <Line data={chartData} />;
 }
 ```
 
 ## Get Top Products
 
 Retrieve best-selling products analytics.
 
 ```http
 GET /api/dashboard/products/top?limit=10&period=30d
 Authorization: Bearer <token>
 ```
 
 ### Query Parameters
 
 | Parameter | Type | Default | Description |
 |-----------|------|---------|-------------|
 | `limit` | number | 10 | Number of products to return |
 | `period` | string | 30d | Time period (7d, 30d, 90d, 1y, all) |
 | `sortBy` | string | revenue | Sort by: revenue, quantity, orders |
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": [
     {
       "product": {
         "id": 1,
         "name": "Luxury Lace Bra",
         "sku": "BRA-001",
         "image": "https://..."
       },
       "stats": {
         "revenue": 125000,
         "quantitySold": 234,
         "orders": 198,
         "averagePrice": 534
       }
     }
   ]
 }
 ```
 
 ## Get Sales by Category
 
 Retrieve sales breakdown by product category.
 
 ```http
 GET /api/dashboard/sales/by-category?startDate=2024-01-01&endDate=2024-01-31
 Authorization: Bearer <token>
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": [
     {
       "category": {
         "id": 1,
         "name": "Bras",
         "slug": "bras"
       },
       "revenue": 280000,
       "orders": 456,
       "products": 89,
       "percentage": 45.2
     },
     {
       "category": {
         "id": 2,
         "name": "Panties",
         "slug": "panties"
       },
       "revenue": 180000,
       "orders": 342,
       "products": 123,
       "percentage": 29.1
     }
   ]
 }
 ```
 
 ### Pie Chart Example
 
 ```tsx
 import { Pie } from 'react-chartjs-2';
 
 function CategorySalesPie() {
   const [data, setData] = useState(null);
 
   useEffect(() => {
     async function fetchData() {
       const response = await fetch('/api/dashboard/sales/by-category', {
         headers: { 'Authorization': `Bearer ${token}` }
       });
       const result = await response.json();
       setData(result.data);
     }
     fetchData();
   }, []);
 
   if (!data) return <div>Loading...</div>;
 
   const chartData = {
     labels: data.map(d => d.category.name),
     datasets: [
       {
         data: data.map(d => d.revenue),
         backgroundColor: [
           'rgba(255, 99, 132, 0.6)',
           'rgba(54, 162, 235, 0.6)',
           'rgba(255, 206, 86, 0.6)',
           'rgba(75, 192, 192, 0.6)'
         ]
       }
     ]
   };
 
   return <Pie data={chartData} />;
 }
 ```
 
 ## Get Customer Analytics
 
 Retrieve customer behavior and demographics analytics.
 
 ```http
 GET /api/dashboard/customers/analytics
 Authorization: Bearer <token>
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "total": 892,
     "new": {
       "thisMonth": 45,
       "lastMonth": 38,
       "growth": 18.4
     },
     "retention": {
       "rate": 65.3,
       "repeatingCustomers": 582
     },
     "averageOrderValue": 543000,
     "lifetimeValue": 2340000,
     "byRegion": [
       {
         "region": "Ho Chi Minh City",
         "customers": 456,
         "percentage": 51.1
       },
       {
         "region": "Hanoi",
         "customers": 234,
         "percentage": 26.2
       }
     ]
   }
 }
 ```
 
 ## Get Low Stock Products
 
 Retrieve products with low or out of stock status.
 
 ```http
 GET /api/dashboard/products/low-stock?threshold=10
 Authorization: Bearer <token>
 ```
 
 ### Query Parameters
 
 | Parameter | Type | Default | Description |
 |-----------|------|---------|-------------|
 | `threshold` | number | 10 | Stock level threshold |
 | `includeOutOfStock` | boolean | true | Include out of stock items |
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": [
     {
       "id": 15,
       "name": "Satin Nightgown",
       "sku": "NG-015",
       "stock": 3,
       "status": "LOW_STOCK",
       "reorderPoint": 10,
       "lastSoldDate": "2024-01-30",
       "averageSalesPerDay": 2
     },
     {
       "id": 23,
       "name": "Lace Teddy",
       "sku": "TD-023",
       "stock": 0,
       "status": "OUT_OF_STOCK",
       "reorderPoint": 15,
       "lastSoldDate": "2024-01-28",
       "averageSalesPerDay": 3
     }
   ]
 }
 ```
 
 ## Export Reports
 
 Export analytics data in various formats.
 
 ```http
 POST /api/dashboard/export
 Authorization: Bearer <token>
 Content-Type: application/json
 ```
 
 ### Request Body
 
 ```json
 {
   "type": "revenue",
   "format": "csv",
   "startDate": "2024-01-01",
   "endDate": "2024-01-31",
   "options": {
     "includeCharts": false,
     "interval": "day"
   }
 }
 ```
 
 ### Supported Export Types
 
 - `revenue` - Revenue report
 - `orders` - Order list
 - `products` - Product inventory
 - `customers` - Customer list
 - `sales-by-category` - Category breakdown
 
 ### Supported Formats
 
 - `csv` - Comma-separated values
 - `xlsx` - Excel spreadsheet
 - `pdf` - PDF report
 - `json` - JSON data
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "downloadUrl": "https://example.com/exports/report-123.csv",
     "expiresAt": "2024-01-31T23:59:59Z",
     "fileSize": 15234
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function exportReport(type, format, dateRange, token) {
   const response = await fetch('http://localhost:5000/api/dashboard/export', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       type,
       format,
       ...dateRange
     })
   });
 
   const result = await response.json();
   
   // Download the file
   window.location.href = result.data.downloadUrl;
 }
 
 // Usage
 await exportReport('revenue', 'csv', {
   startDate: '2024-01-01',
   endDate: '2024-01-31'
 }, adminToken);
 ```
 
 ## Complete Dashboard Example
 
 ```tsx
 import { useState, useEffect } from 'react';
 
 function DashboardPage() {
   const [overview, setOverview] = useState(null);
   const [revenue, setRevenue] = useState(null);
   const [topProducts, setTopProducts] = useState(null);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     async function fetchDashboardData() {
       try {
         setLoading(true);
         const token = localStorage.getItem('token');
 
         // Fetch all data in parallel
         const [overviewRes, revenueRes, productsRes] = await Promise.all([
           fetch('/api/dashboard/overview', {
             headers: { 'Authorization': `Bearer ${token}` }
           }),
           fetch('/api/dashboard/revenue?interval=day', {
             headers: { 'Authorization': `Bearer ${token}` }
           }),
           fetch('/api/dashboard/products/top?limit=5', {
             headers: { 'Authorization': `Bearer ${token}` }
           })
         ]);
 
         const [overviewData, revenueData, productsData] = await Promise.all([
           overviewRes.json(),
           revenueRes.json(),
           productsRes.json()
         ]);
 
         setOverview(overviewData.data);
         setRevenue(revenueData.data);
         setTopProducts(productsData.data);
       } catch (error) {
         console.error('Error fetching dashboard data:', error);
       } finally {
         setLoading(false);
       }
     }
 
     fetchDashboardData();
   }, []);
 
   if (loading) return <div>Loading dashboard...</div>;
 
   return (
     <div className="dashboard">
       {/* Overview Cards */}
       <div className="stats-grid">
         <StatCard
           title="Total Revenue"
           value={overview.revenue.total}
           growth={overview.revenue.growth}
         />
         <StatCard
           title="Total Orders"
           value={overview.orders.total}
         />
         <StatCard
           title="Total Customers"
           value={overview.customers.total}
         />
       </div>
 
       {/* Revenue Chart */}
       <RevenueChart data={revenue.timeseries} />
 
       {/* Top Products */}
       <TopProductsTable products={topProducts} />
     </div>
   );
 }
 ```
 
 ## Real-time Updates
 
 For real-time dashboard updates, use WebSocket or polling:
 
 ```javascript
 // Polling example (refresh every 30 seconds)
 function useDashboardPolling(interval = 30000) {
   const [data, setData] = useState(null);
 
   useEffect(() => {
     async function fetchData() {
       const response = await fetch('/api/dashboard/overview', {
         headers: { 'Authorization': `Bearer ${token}` }
       });
       const result = await response.json();
       setData(result.data);
     }
 
     // Initial fetch
     fetchData();
 
     // Set up polling
     const intervalId = setInterval(fetchData, interval);
 
     // Cleanup
     return () => clearInterval(intervalId);
   }, [interval]);
 
   return data;
 }
 
 // Usage
 function Dashboard() {
   const overview = useDashboardPolling(30000); // Update every 30s
   
   return <div>{/* Render dashboard */}</div>;
 }
 ```
 
 ## Error Handling
 
 ```json
 {
   "success": false,
   "error": "Insufficient permissions to access dashboard"
 }
 ```
 
 ## Performance Tips
 
 1. **Cache dashboard data** for 5-10 minutes
 2. **Use pagination** for large datasets
 3. **Implement date range limits** to prevent expensive queries
 4. **Pre-aggregate data** for common reports
 5. **Use database indexes** on date and status fields
