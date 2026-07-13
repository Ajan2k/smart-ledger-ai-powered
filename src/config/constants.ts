// tag colors
export const TAG_COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Gray', value: '#6b7280' },
];

// currencies
export const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export const INITIAL_CATEGORIES = [
  { id: 'cat-inc-1', name: 'Salary', type: 'income', color: '#10B981' },
  { id: 'cat-inc-2', name: 'Bonus', type: 'income', color: '#10B981' },
  { id: 'cat-inc-3', name: 'Investment', type: 'income', color: '#10B981' },
  { id: 'cat-inc-4', name: 'Business', type: 'income', color: '#10B981' },
  { id: 'cat-inc-5', name: 'Rental', type: 'income', color: '#10B981' },
  { id: 'cat-inc-6', name: 'Freelance', type: 'income', color: '#10B981' },
  { id: 'cat-inc-7', name: 'Part-time', type: 'income', color: '#10B981' },
  { id: 'cat-inc-8', name: 'Dividends', type: 'income', color: '#10B981' },
  { id: 'cat-inc-9', name: 'Gifts', type: 'income', color: '#10B981' },
  { id: 'cat-inc-10', name: 'Reimbursement', type: 'income', color: '#10B981' },
  { id: 'cat-inc-11', name: 'Subsidy', type: 'income', color: '#10B981' },
  { id: 'cat-inc-12', name: 'Lottery', type: 'income', color: '#10B981' },
  { id: 'cat-inc-13', name: 'Grants', type: 'income', color: '#10B981' },
  { id: 'cat-inc-14', name: 'Royalties', type: 'income', color: '#10B981' },
  { id: 'cat-inc-15', name: 'Second-hand Sale', type: 'income', color: '#10B981' },
  { id: 'cat-inc-16', name: 'Borrowing', type: 'income', color: '#10B981' },
  { id: 'cat-inc-17', name: 'Charity', type: 'income', color: '#10B981' },
  { id: 'cat-exp-1', name: 'Housing', type: 'expense', color: '#EF4444' },
  { id: 'cat-exp-2', name: 'Food', type: 'expense', color: '#F97316' },
  { id: 'cat-exp-3', name: 'Transportation', type: 'expense', color: '#3B82F6' },
  { id: 'cat-exp-4', name: 'Education', type: 'expense', color: '#A855F7' },
  { id: 'cat-exp-5', name: 'Healthcare', type: 'expense', color: '#EC4899' },
  { id: 'cat-exp-6', name: 'Entertainment', type: 'expense', color: '#EAB308' },
  { id: 'cat-exp-7', name: 'Shopping', type: 'expense', color: '#6B7280' },
  { id: 'cat-exp-8', name: 'Social', type: 'expense', color: '#22C55E' },
  { id: 'cat-exp-9', name: 'Other', type: 'expense', color: '#9CA3AF' }
];

// languages
export const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

// initial tags
export const INITIAL_TAGS = [
    // Food-related
    { name: 'Breakfast', color: '#E63946', description: 'Breakfast expenses' },
    { name: 'Lunch', color: '#D62828', description: 'Lunch expenses' },
    { name: 'Dinner', color: '#C1121F', description: 'Dinner expenses' },
    { name: 'Snacks', color: '#780000', description: 'Snacks and drinks' },
    { name: 'Groceries', color: '#9D0208', description: 'Fresh food' },
    
    // Transportation-related
    { name: 'Taxi', color: '#1A535C', description: 'Taxi expenses' },
    { name: 'Public', color: '#2A9D8F', description: 'Public transportation' },
    { name: 'Parking', color: '#006D77', description: 'Parking fees' },
    { name: 'Fuel', color: '#073B4C', description: 'Fuel expenses' },
    
    // Shopping-related
    { name: 'Clothing', color: '#7209B7', description: 'Clothing and accessories' },
    { name: 'Electronics', color: '#3A0CA3', description: 'Electronics and appliances' },
    { name: 'Beauty', color: '#4CC9F0', description: 'Personal care and beauty' },
    { name: 'Gifts', color: '#4361EE', description: 'Gifts and presents' },
    
    // Life services
    { name: 'Rent', color: '#2B2D42', description: 'Rent and utilities' },
    { name: 'Medical', color: '#8D0801', description: 'Medical and healthcare' },
    { name: 'Education', color: '#003049', description: 'Education and training' },
    { name: 'Entertainment', color: '#D90429', description: 'Leisure and entertainment' },
    
    // Others
    { name: 'Travel', color: '#1B4332', description: 'Travel and vacation' },
    { name: 'Social', color: '#2D6A4F', description: 'Social interactions' },
    { name: 'Pet', color: '#40916C', description: 'Pet-related expenses' },
    { name: 'Other', color: '#495057', description: 'Other expenses' }
];

export const EMOJI_LIST = [
    { emoji: '💰', name: 'Money' },
    { emoji: '🍔', name: 'Food' },
    { emoji: '🚗', name: 'Transportation' },
    { emoji: '🏠', name: 'Housing' },
    { emoji: '🏥', name: 'Medical' },
    { emoji: '👕', name: 'Clothing' },
    { emoji: '🎮', name: 'Entertainment' },
    { emoji: '📱', name: 'Technology' },
    { emoji: '✈️', name: 'Travel' },
    { emoji: '🎬', name: 'Movies' },
    { emoji: '📚', name: 'Books' },
    { emoji: '🎤', name: 'Music' },
    { emoji: '🎁', name: 'Gift' },
    { emoji: '🎯', name: 'Sports' },
    { emoji: '🎭', name: 'Art' },
];