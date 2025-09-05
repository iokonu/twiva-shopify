import { useState } from 'react';
import { Card, FormLayout, TextField, Button, BlockStack, InlineStack, Badge, Text, Thumbnail } from '@shopify/polaris';

export function ProductCommissionForm({ product, onSave, onRemove }) {
  const [commission, setCommission] = useState(
    product.commission?.commission?.toString() || ''
  );
  const [loading, setLoading] = useState(false);

  const formatPrice = (priceRange) => {
    if (!priceRange) return 'No price available';
    
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

  const handleSave = async () => {
    if (!commission || isNaN(commission)) return;
    
    setLoading(true);
    try {
      await onSave(product.id, parseFloat(commission));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!product.commission) return;
    
    setLoading(true);
    try {
      await onRemove(product.commission.source, product.commission.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap="300" blockAlign="start">
              {product.featuredImage && (
                <Thumbnail
                  source={product.featuredImage.url}
                  alt={product.featuredImage.altText || product.title}
                  size="small"
                />
              )}
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{product.title}</Text>
                <Text as="p" tone="subdued">{formatPrice(product.priceRangeV2)}</Text>
                {product.description && (
                  <Text as="p" tone="subdued" truncate>
                    {product.description.substring(0, 100)}{product.description.length > 100 ? '...' : ''}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
            {product.commission && (
              <Badge tone={product.commission.source === 'product' ? 'success' : 'info'}>
                {product.commission.source === 'product' ? 'Product Rule' : 'Collection Rule'}
              </Badge>
            )}
          </InlineStack>
          
          <FormLayout>
            <TextField
              label="Commission (%)"
              type="number"
              value={commission}
              onChange={setCommission}
              placeholder="e.g., 10.5"
              helpText={
                product.commission?.source === 'collection'
                  ? `Currently using collection rule: ${product.commission.commission}%`
                  : 'Set commission percentage for this product'
              }
            />
            
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={loading}
                disabled={!commission || isNaN(commission)}
              >
                Set Commission
              </Button>
              
              {product.commission?.source === 'product' && (
                <Button
                  tone="critical"
                  onClick={handleRemove}
                  loading={loading}
                >
                  Remove
                </Button>
              )}
            </InlineStack>
          </FormLayout>
        </BlockStack>
      </div>
    </Card>
  );
}