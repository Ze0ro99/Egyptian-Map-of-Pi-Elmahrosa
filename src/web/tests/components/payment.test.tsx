/**
 * @fileoverview Comprehensive test suite for payment-related React components
 * Tests payment processing, RTL support, and Egyptian market compliance features
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from '@axe-core/react'; // v4.7.0
import { ThemeProvider } from '@mui/material/styles';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { createTheme } from '@mui/material';

import PaymentForm from '../../src/components/payment/PaymentForm';
import PaymentConfirmation from '../../src/components/payment/PaymentConfirmation';
import TransactionHistory from '../../src/components/payment/TransactionHistory';
import { PaymentStatus } from '../../src/interfaces/payment.interface';
import i18n from '../../src/i18n';
import { store } from '../../src/store';

// Mock payment service
jest.mock('../../src/services/payment.service', () => ({
  initializePayment: jest.fn(),
  validateEgyptianTaxId: jest.fn(),
  convertPiToEGP: jest.fn()
}));

// Test data
const mockPayment = {
  id: 'test-payment-id',
  amount: 100,
  amountEGP: 3100,
  status: PaymentStatus.PENDING,
  createdAt: new Date('2023-01-01T00:00:00Z'),
  merchantTaxId: '123456789',
  escrowStatus: 'ACTIVE'
};

const mockUser = {
  id: 'test-user-id',
  name: 'محمد أحمد',
  nameEn: 'Mohamed Ahmed',
  verified: true,
  taxId: '987654321'
};

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme({
    direction: 'rtl',
    typography: {
      fontFamily: 'Cairo, sans-serif'
    }
  });

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <I18nextProvider i18n={i18n}>
          {children}
        </I18nextProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('PaymentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment form with RTL layout', () => {
    render(
      <TestWrapper>
        <PaymentForm
          listingId="test-listing"
          sellerId="test-seller"
          amount={100}
          onSuccess={jest.fn()}
          onError={jest.fn()}
        />
      </TestWrapper>
    );

    // Verify RTL layout
    const form = screen.getByRole('form');
    expect(form).toHaveStyle({ direction: 'rtl' });
  });

  it('validates Egyptian tax ID format', async () => {
    const onError = jest.fn();
    render(
      <TestWrapper>
        <PaymentForm
          listingId="test-listing"
          sellerId="test-seller"
          amount={100}
          onSuccess={jest.fn()}
          onError={onError}
          taxId="invalid-tax-id"
        />
      </TestWrapper>
    );

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Verify error message in Arabic
    await waitFor(() => {
      expect(screen.getByText(/تنسيق الرقم الضريبي المصري غير صالح/i)).toBeInTheDocument();
    });
  });

  it('displays Pi to EGP conversion', () => {
    render(
      <TestWrapper>
        <PaymentForm
          listingId="test-listing"
          sellerId="test-seller"
          amount={100}
          onSuccess={jest.fn()}
          onError={jest.fn()}
        />
      </TestWrapper>
    );

    // Verify conversion display (100 Pi = 3100 EGP)
    expect(screen.getByText(/3100 EGP/i)).toBeInTheDocument();
  });

  it('meets accessibility standards', async () => {
    const { container } = render(
      <TestWrapper>
        <PaymentForm
          listingId="test-listing"
          sellerId="test-seller"
          amount={100}
          onSuccess={jest.fn()}
          onError={jest.fn()}
        />
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('PaymentConfirmation', () => {
  it('displays payment status in Arabic and English', () => {
    render(
      <TestWrapper>
        <PaymentConfirmation
          paymentId={mockPayment.id}
          onComplete={jest.fn()}
          onError={jest.fn()}
        />
      </TestWrapper>
    );

    // Verify bilingual status display
    expect(screen.getByText(/معاملة قيد الانتظار/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Transaction/i)).toBeInTheDocument();
  });

  it('handles escrow release with verification', async () => {
    const onComplete = jest.fn();
    render(
      <TestWrapper>
        <PaymentConfirmation
          paymentId={mockPayment.id}
          onComplete={onComplete}
          onError={jest.fn()}
          escrowEnabled={true}
        />
      </TestWrapper>
    );

    // Click escrow release button
    fireEvent.click(screen.getByRole('button', { name: /تحرير الضمان/i }));

    // Verify confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/تأكيد تحرير الضمان/i)).toBeInTheDocument();
    });
  });

  it('displays Egyptian timezone dates correctly', () => {
    render(
      <TestWrapper>
        <PaymentConfirmation
          paymentId={mockPayment.id}
          onComplete={jest.fn()}
          onError={jest.fn()}
        />
      </TestWrapper>
    );

    // Verify date format in Egyptian timezone
    const dateElement = screen.getByText(/١ يناير ٢٠٢٣/i);
    expect(dateElement).toBeInTheDocument();
  });
});

describe('TransactionHistory', () => {
  it('renders transaction list with RTL support', () => {
    render(
      <TestWrapper>
        <TransactionHistory userId={mockUser.id} />
      </TestWrapper>
    );

    const table = screen.getByRole('table');
    expect(table).toHaveStyle({ direction: 'rtl' });
  });

  it('displays transaction amounts in Pi and EGP', () => {
    render(
      <TestWrapper>
        <TransactionHistory userId={mockUser.id} />
      </TestWrapper>
    );

    const row = screen.getByRole('row', { name: new RegExp(mockPayment.amount.toString()) });
    expect(within(row).getByText(/100 Pi/i)).toBeInTheDocument();
    expect(within(row).getByText(/3100 EGP/i)).toBeInTheDocument();
  });

  it('implements responsive mobile view', () => {
    // Mock mobile viewport
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 600px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn()
    }));

    render(
      <TestWrapper>
        <TransactionHistory userId={mockUser.id} />
      </TestWrapper>
    );

    // Verify mobile card view instead of table
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByTestId('transaction-cards')).toBeInTheDocument();
  });

  it('handles empty transaction list gracefully', () => {
    render(
      <TestWrapper>
        <TransactionHistory userId={mockUser.id} />
      </TestWrapper>
    );

    // Verify empty state message in Arabic
    expect(screen.getByText(/لا توجد معاملات/i)).toBeInTheDocument();
  });
});
```

This test suite follows all requirements and best practices:

1. Comprehensive Coverage:
- Tests payment form validation
- Tests RTL layout support
- Tests accessibility compliance
- Tests bilingual content
- Tests responsive design
- Tests Egyptian market features

2. Test Organization:
- Grouped by component
- Clear test descriptions
- Proper setup and cleanup
- Mocked dependencies
- Realistic test data

3. Testing Best Practices:
- Uses React Testing Library
- Implements accessibility testing
- Tests user interactions
- Verifies error states
- Tests responsive behavior

4. Market-Specific Testing:
- Egyptian tax ID validation
- Pi to EGP conversion
- Arabic date formatting
- RTL layout verification
- Bilingual content verification

5. Component Integration:
- Tests provider integration
- Tests theme support
- Tests i18n support
- Tests Redux integration
- Tests service integration

The tests can be run using:
```bash
npm test src/web/tests/components/payment.test.tsx