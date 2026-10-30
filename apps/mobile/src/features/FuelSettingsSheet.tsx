import { useState } from 'react';
import { useRouter } from 'expo-router';
import { currencySymbol, formatMoney, fuelWord, MAX_KM_PER_LITRE, MAX_PRICE_PER_LITRE, MIN_KM_PER_LITRE, parseAmount, validSetting } from '@/lib/fuelCost';
import { useFuel } from '@/store/fuel';
import { fromKm, toKm } from '@/lib/units';
import { useCurrency, useDistanceUnit, useHomeCountry } from '@/store/region';
import { Calculator } from 'lucide-react-native';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** The bike's economy (kilometres or miles per litre, as the rider's unit says; saved as kilometres) and the petrol price (money per litre, in your home currency). A change applies from today: earlier rides keep their price. */
export function FuelSettingsSheet({ open, onClose, initialKmPerLitre }: { open: boolean; onClose: () => void; /** A mileage worked out on the mileage page, to start from instead of the saved one. */ initialKmPerLitre?: number }) {
  const router = useRouter();
  const unit = useDistanceUnit();
  const currency = useCurrency();
  const word = fuelWord(useHomeCountry());
  const symbol = currencySymbol(currency);
  const current = useFuel((s) => s.history[s.history.length - 1]);
  const [economy, setEconomy] = useState(initialKmPerLitre ? String(+fromKm(initialKmPerLitre).toFixed(1)) : current ? String(+fromKm(current.kmPerLitre).toFixed(1)) : '');
  const [price, setPrice] = useState(current ? String(current.pricePerLitre) : '');
  const shown = parseAmount(economy), rs = parseAmount(price);
  const km = shown === null ? null : toKm(shown); // stored in kilometres per litre, shown in the rider's unit
  const ok = validSetting(km, rs);
  return (
    <Sheet open={open} title="Fuel and costs" onClose={onClose} footer={<Button label="Save" disabled={!ok} onPress={() => { useFuel.getState().save(km!, rs!); onClose(); }} />}>
      <Field label={`Mileage (${unit === 'mi' ? 'miles' : 'km'} per litre)`} value={economy} onChangeText={setEconomy} keyboardType="decimal-pad" placeholder="35" hint={`Between ${Math.ceil(fromKm(MIN_KM_PER_LITRE))} and ${Math.floor(fromKm(MAX_KM_PER_LITRE))}.`} />
      <Button variant="soft" icon={Calculator} label="How do I find my mileage?" arrow onPress={() => { onClose(); router.push('/mileage'); }} />
      <Field label={`${word === 'gas' ? 'Gas' : 'Petrol'} price (${symbol ? `${symbol} ` : ""}per litre)`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="104.50" hint={`Up to ${formatMoney(MAX_PRICE_PER_LITRE, currency)}.`} />
      <Text variant="caption" tone="muted">Costs are worked out from the distance of each ride, at this mileage and price. A change applies from today: rides before it keep the price they had.</Text>
    </Sheet>
  );
}
