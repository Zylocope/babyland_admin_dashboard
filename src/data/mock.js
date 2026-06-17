// Mock data for development — replace with API calls when backend is ready

export const CATEGORIES = [
  'Toys',
  'Bag/Thai goods',
  'Boy Clothes',
  'Girl Clothes',
  'Diaper/Shampoo/Lotion',
  'Stationery',
  'Lunch box/Bottle',
  'Accessories',
  'Watches',
];

export const mockProducts = [
  { id: 'P001', barcode: '8850001001234', name: 'Soft Bear Plush Toy', category: 'Toys', stock: 42, unit: 'pcs', price: 15000, image: null, visible: true, lowStockThreshold: 10 },
  { id: 'P002', barcode: '8850001002345', name: 'Baby Diaper Size M (Pack)', category: 'Diaper/Shampoo/Lotion', stock: 8, unit: 'pack', price: 12500, image: null, visible: true, lowStockThreshold: 15 },
  { id: 'P003', barcode: '8850001003456', name: 'Girl Summer Dress Set', category: 'Girl Clothes', stock: 25, unit: 'set', price: 18000, image: null, visible: true, lowStockThreshold: 5 },
  { id: 'P004', barcode: '8850001004567', name: 'Boy Denim Overalls', category: 'Boy Clothes', stock: 3, unit: 'pcs', price: 22000, image: null, visible: true, lowStockThreshold: 5 },
  { id: 'P005', barcode: '8850001005678', name: 'Thai Cotton Tote Bag', category: 'Bag/Thai goods', stock: 19, unit: 'pcs', price: 9500, image: null, visible: false, lowStockThreshold: 5 },
  { id: 'P006', barcode: '8850001006789', name: 'Baby Shampoo 200ml', category: 'Diaper/Shampoo/Lotion', stock: 6, unit: 'bottle', price: 7500, image: null, visible: true, lowStockThreshold: 10 },
  { id: 'P007', barcode: '8850001007890', name: 'Stainless Lunch Box Set', category: 'Lunch box/Bottle', stock: 14, unit: 'set', price: 25000, image: null, visible: true, lowStockThreshold: 5 },
  { id: 'P008', barcode: '8850001008901', name: 'Kids Digital Watch', category: 'Watches', stock: 2, unit: 'pcs', price: 35000, image: null, visible: true, lowStockThreshold: 5 },
  { id: 'P009', barcode: '8850001009012', name: 'Colour Pencil Set 24pcs', category: 'Stationery', stock: 31, unit: 'set', price: 6500, image: null, visible: true, lowStockThreshold: 10 },
  { id: 'P010', barcode: '8850001010123', name: 'Baby Hair Clip Set', category: 'Accessories', stock: 55, unit: 'set', price: 3500, image: null, visible: true, lowStockThreshold: 10 },
  { id: 'P011', barcode: '8850001011234', name: 'Lego Duplo Blocks 30pcs', category: 'Toys', stock: 7, unit: 'box', price: 45000, image: null, visible: true, lowStockThreshold: 5 },
  { id: 'P012', barcode: '8850001012345', name: 'Baby Lotion 150ml', category: 'Diaper/Shampoo/Lotion', stock: 4, unit: 'bottle', price: 8000, image: null, visible: true, lowStockThreshold: 10 },
];

export const mockOrders = [
  {
    id: 'ORD-2024-001', date: '2024-06-07', customerName: 'မ မြင့်မြတ်', phone: '09-123-456-789',
    items: [{ name: 'Soft Bear Plush Toy', qty: 2, price: 15000 }, { name: 'Baby Hair Clip Set', qty: 1, price: 3500 }],
    total: 33500, status: 'Pending', address: 'No.12, Naypyidaw Township, Naypyidaw'
  },
  {
    id: 'ORD-2024-002', date: '2024-06-07', customerName: 'ဦး ကျော်မင်း', phone: '09-987-654-321',
    items: [{ name: 'Girl Summer Dress Set', qty: 1, price: 18000 }],
    total: 18000, status: 'Processing', address: 'No.5, Zabuthiri Township, Naypyidaw'
  },
  {
    id: 'ORD-2024-003', date: '2024-06-06', customerName: 'Daw Su Su Lwin', phone: '09-555-111-222',
    items: [{ name: 'Baby Diaper Size M', qty: 3, price: 12500 }, { name: 'Baby Shampoo 200ml', qty: 2, price: 7500 }],
    total: 52500, status: 'Shipped', address: 'No.88, Ottarathiri Township, Naypyidaw'
  },
  {
    id: 'ORD-2024-004', date: '2024-06-06', customerName: 'U Aung Zaw', phone: '09-444-333-222',
    items: [{ name: 'Lego Duplo Blocks 30pcs', qty: 1, price: 45000 }],
    total: 45000, status: 'Delivered', address: 'No.3, Dekhina Township, Naypyidaw'
  },
  {
    id: 'ORD-2024-005', date: '2024-06-05', customerName: 'မ နှင်းဆီ', phone: '09-777-888-999',
    items: [{ name: 'Colour Pencil Set 24pcs', qty: 2, price: 6500 }, { name: 'Stainless Lunch Box Set', qty: 1, price: 25000 }],
    total: 38000, status: 'Delivered', address: 'No.21, Pyinmana Township, Naypyidaw'
  },
  {
    id: 'ORD-2024-006', date: '2024-06-07', customerName: 'Ko Thiha', phone: '09-112-233-445',
    items: [{ name: 'Boy Denim Overalls', qty: 1, price: 22000 }, { name: 'Baby Lotion 150ml', qty: 1, price: 8000 }],
    total: 30000, status: 'Pending', address: 'No.9, Lewe Township, Naypyidaw'
  },
];

export const mockTickets = [
  { id: 'TKT-2024-001', customerName: 'မ မြင့်မြတ်', phone: '09-123-456-789', visitDate: '2024-06-08', qty: 2, amount: 20000, status: 'Confirmed', type: 'Online' },
  { id: 'TKT-2024-002', customerName: 'ဦး ကျော်မင်း', phone: '09-987-654-321', visitDate: '2024-06-08', qty: 3, amount: 30000, status: 'Confirmed', type: 'Online' },
  { id: 'TKT-2024-003', customerName: 'Walk-in Customer', phone: '-', visitDate: '2024-06-07', qty: 1, amount: 10000, status: 'Used', type: 'Walk-in' },
  { id: 'TKT-2024-004', customerName: 'Daw Su Su Lwin', phone: '09-555-111-222', visitDate: '2024-06-09', qty: 4, amount: 40000, status: 'Confirmed', type: 'Online' },
  { id: 'TKT-2024-005', customerName: 'Walk-in Family', phone: '-', visitDate: '2024-06-07', qty: 2, amount: 20000, status: 'Used', type: 'Walk-in' },
  { id: 'TKT-2024-006', customerName: 'Ko Thiha', phone: '09-112-233-445', visitDate: '2024-06-10', qty: 2, amount: 20000, status: 'Cancelled', type: 'Online' },
];

export const mockCustomers = [
  { id: 'C001', name: 'မ မြင့်မြတ်', phone: '09-123-456-789', email: 'mg.mg@email.com', address: 'No.12, Naypyidaw Township, Naypyidaw', points: 335, joinDate: '2024-01-15', orderCount: 5 },
  { id: 'C002', name: 'ဦး ကျော်မင်း', phone: '09-987-654-321', email: 'kyaw.mg@email.com', address: 'No.5, Zabuthiri Township, Naypyidaw', points: 180, joinDate: '2024-02-20', orderCount: 2 },
  { id: 'C003', name: 'Daw Su Su Lwin', phone: '09-555-111-222', email: 'su.su@email.com', address: 'No.88, Ottarathiri Township, Naypyidaw', points: 525, joinDate: '2023-11-05', orderCount: 8 },
  { id: 'C004', name: 'U Aung Zaw', phone: '09-444-333-222', email: 'aung.zaw@email.com', address: 'No.3, Dekhina Township, Naypyidaw', points: 450, joinDate: '2023-12-01', orderCount: 4 },
  { id: 'C005', name: 'မ နှင်းဆီ', phone: '09-777-888-999', email: 'hnin.si@email.com', address: 'No.21, Pyinmana Township, Naypyidaw', points: 380, joinDate: '2024-03-10', orderCount: 6 },
  { id: 'C006', name: 'Ko Thiha', phone: '09-112-233-445', email: 'thiha@email.com', address: 'No.9, Lewe Township, Naypyidaw', points: 300, joinDate: '2024-04-22', orderCount: 3 },
];

export const mockStaff = [
  { id: 'S001', username: 'manager55', name: 'Mg Mg (Manager)', role: 'Manager', email: 'manager@appleland.mm', phone: '09-100-200-300', createdAt: '2023-06-01' },
  { id: 'S002', username: 'sale77', name: 'Su Su (Sale Staff)', role: 'SaleStaff', email: 'sale@appleland.mm', phone: '09-300-400-500', createdAt: '2023-08-15' },
  { id: 'S003', username: 'ticket77', name: 'Kyaw Kyaw (Ticket Staff)', role: 'TicketStaff', email: 'ticket@appleland.mm', phone: '09-400-500-600', createdAt: '2024-01-10' },
];

export const mockBookingSlots = [
  { date: '2024-06-08', maxCapacity: 50, booked: 25, open: true },
  { date: '2024-06-09', maxCapacity: 50, booked: 40, open: true },
  { date: '2024-06-10', maxCapacity: 50, booked: 10, open: true },
  { date: '2024-06-11', maxCapacity: 50, booked: 0, open: false },
  { date: '2024-06-12', maxCapacity: 50, booked: 5, open: true },
];

export const ticketPrice = 10000;

export const mockDashboard = {
  todayStoreSales: 81500,
  todayTicketSales: 70000,
  pendingOrders: 2,
  completedOrders: 2,
  lowStockCount: 5,
  recentOrders: mockOrders.slice(0, 5),
};

export const mockReports = {
  dailySales: [
    { date: '2024-06-01', storeSales: 125000, ticketSales: 60000 },
    { date: '2024-06-02', storeSales: 87000, ticketSales: 80000 },
    { date: '2024-06-03', storeSales: 210000, ticketSales: 50000 },
    { date: '2024-06-04', storeSales: 95000, ticketSales: 100000 },
    { date: '2024-06-05', storeSales: 155000, ticketSales: 70000 },
    { date: '2024-06-06', storeSales: 97500, ticketSales: 90000 },
    { date: '2024-06-07', storeSales: 81500, ticketSales: 70000 },
  ],
};
