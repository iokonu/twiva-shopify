import { useState } from 'react';
import { Card, DataTable, Button, Modal, FormLayout, TextField, InlineStack, Badge, Text, Thumbnail, BlockStack } from '@shopify/polaris';

export function ProductTable({ products, onProductSelect, onSave, onRemove, selectedProduct }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [commission, setCommission] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPrice = (priceRange) => {
    if (!priceRange) return 'N/A';
    
    const minPrice = parseFloat(priceRange.minVariantPrice.amount);
    const maxPrice = parseFloat(priceRange.maxVariantPrice.amount);
    const currency = priceRange.minVariantPrice.currencyCode;
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };
    
    if (minPrice === maxPrice) {
      return formatCurrency(minPrice);
    } else {
      return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
    }
  };

  const calculateCommissionAmount = (product) => {
    if (!product.commission || !product.priceRangeV2) return 'N/A';
    
    const price = parseFloat(product.priceRangeV2.minVariantPrice.amount);
    const commissionPercent = product.commission.commission;
    const commissionAmount = (price * commissionPercent) / 100;
    const currency = product.priceRangeV2.minVariantPrice.currencyCode;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(commissionAmount);
  };

  const handleRowClick = (product) => {
    onProductSelect(product);
    setCommission(product.commission?.commission?.toString() || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!commission || isNaN(commission) || !selectedProduct) return;
    
    setLoading(true);
    try {
      await onSave(selectedProduct.id, parseFloat(commission));
      setModalOpen(false);
      setCommission('');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedProduct?.commission) return;
    
    setLoading(true);
    try {
      await onRemove(selectedProduct.commission.source, selectedProduct.commission.id);
      setModalOpen(false);
      setCommission('');
    } finally {
      setLoading(false);
    }
  };

  const rows = products.map((product) => [
    <InlineStack gap="200" blockAlign="center">
      {product.featuredImage && (
        <Thumbnail
          source={product.featuredImage.url}
          alt={product.featuredImage.altText || product.title}
          size="small"
        />
      )}
      <BlockStack gap="100">
        <Text variant="bodyMd" fontWeight="semibold">{product.title}</Text>
        {product.description && (
          <Text as="p" tone="subdued" truncate>
            {product.description.substring(0, 60)}{product.description.length > 60 ? '...' : ''}
          </Text>
        )}
      </BlockStack>
    </InlineStack>,
    formatPrice(product.priceRangeV2),
    product.commission ? (
      <InlineStack gap="200">
        <Badge tone={product.commission.source === 'product' ? 'success' : 'info'}>
          {product.commission.commission}%
        </Badge>
        <Text tone="subdued">
          ({product.commission.source === 'product' ? 'Product' : 'Collection'})
        </Text>
      </InlineStack>
    ) : (
      <Text tone="subdued">No commission</Text>
    ),
    product.commission ? calculateCommissionAmount(product) : 'N/A',
    <Button
      size="slim"
      onClick={() => handleRowClick(product)}
    >
      Edit Commission
    </Button>,
  ]);

  return (
    <>
      <Card>
        <div style={{ padding: '16px' }}>
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h3">
              Products ({products.length})
            </Text>
          </InlineStack>
          
          {products.length > 0 ? (
            <div style={{ marginTop: '16px' }}>
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                ]}
                headings={[
                  'Product',
                  'Price',
                  'Commission',
                  'Commission Amount',
                  'Actions',
                ]}
                rows={rows}
                hoverable
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <Text as="p" tone="subdued">
                No products found. Try adjusting your search terms.
              </Text>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Edit Commission - ${selectedProduct?.title}`}
        primaryAction={{
          content: 'Save Commission',
          onAction: handleSave,
          loading,
          disabled: !commission || isNaN(commission),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setModalOpen(false),
          },
          ...(selectedProduct?.commission?.source === 'product' ? [{
            content: 'Remove Commission',
            onAction: handleRemove,
            loading,
            destructive: true,
          }] : []),
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Commission (%)"
              type="number"
              value={commission}
              onChange={setCommission}
              placeholder="e.g., 10.5"
              helpText={
                selectedProduct?.commission?.source === 'collection'
                  ? `Currently using collection rule: ${selectedProduct.commission.commission}%`
                  : 'Set commission percentage for this product'
              }
            />
            
            {selectedProduct && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                <Text variant="headingXs" as="h4">Commission Preview</Text>
                <InlineStack gap="400" align="space-between">
                  <Text>Product Price:</Text>
                  <Text fontWeight="semibold">{formatPrice(selectedProduct.priceRangeV2)}</Text>
                </InlineStack>
                {commission && !isNaN(commission) && (
                  <InlineStack gap="400" align="space-between">
                    <Text>Commission ({commission}%):</Text>
                    <Text fontWeight="semibold" tone="success">
                      {selectedProduct.priceRangeV2 ? 
                        new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: selectedProduct.priceRangeV2.minVariantPrice.currencyCode,
                        }).format((parseFloat(selectedProduct.priceRangeV2.minVariantPrice.amount) * parseFloat(commission)) / 100)
                        : 'N/A'
                      }
                    </Text>
                  </InlineStack>
                )}
              </div>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>
    </>
  );
}