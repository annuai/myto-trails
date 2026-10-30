import { useState } from 'react';
import { currencySymbol, formatMoney, MAX_KM_PER_LITRE, MAX_PRICE_PER_LITRE, MIN_KM_PER_LITRE, parseAmount, validSetting } from '@/lib/fuelCost';
import { useFuel } from '@/store/fuel';
import { useCurrency } from '@/store/region';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** The bike's economy (kilometres per litre) and the petrol price (money per litre, in your home currency). A change applies from today: earlier rides keep their price. */
export function FuelSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currency = useCurrency();
  const symbol = currencySymbol(currency);
  const current = useFuel((s) => s.history[s.history.length - 1]);
  const [economy, setEconomy] = useState(current ? String(current.kmPerLitre) : '');
  const [price, setPrice] = useState(current ? String(current.pricePerLitre) : '');
  const km = parseAmount(economy), rs = parseAmount(price);
  const ok = validSetting(km, rs);
  return (
    <Sheet open={open} title="Fuel and costs" onClose={onClose} footer={<Button label="Save" disabled={!ok} onPress={() => { useFuel.getState().save(km!, rs!); onClose(); }} />}>
      <Field label="Mileage (km per litre)" value={economy} onChangeText={setEconomy} keyboardType="decimal-pad" placeholder="35" hint={`Between ${MIN_KM_PER_LITRE} and ${MAX_KM_PER_LITRE}.`} />
      <Field label={`Petrol price (${symbol ? `${symbol} ` : ""}per litre)`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="104.50" hint={`Up to ${formatMoney(MAX_PRICE_PER_LITRE, currency)}.`} />
      <Text variant="caption" tone="muted">Costs are worked out from the distance of each ride, at this mileage and price. A change applies from today: rides before it keep the price they had.</Text>
    </Sheet>
  );
}
