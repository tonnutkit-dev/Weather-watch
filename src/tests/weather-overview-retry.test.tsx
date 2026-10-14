import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WeatherOverview } from '../components/WeatherOverview';
import type { SituationProps } from '../components/SituationPanel';
import { normalizeWeather } from '../providers/weather';
import { defaultLocation } from '../locations/provinces';
import fixture from '../../diagnostics-p0/provider-fixtures.json';

it('cached refresh failure retains labeled data and an actionable weather retry', () => {
  const body = structuredClone(fixture.weather.body);
  body.current.time = Math.floor(Date.now() / 1000);
  const data = normalizeWeather(body, defaultLocation);
  const onRefresh = vi.fn();
  render(<WeatherOverview location={defaultLocation} now={Date.now()} favorite={false}
    onFavorite={vi.fn()} onSearch={vi.fn()} onRefresh={onRefresh}
    weather={{ data, isError: true, isPending: false, isFetching: false,
      error: new Error('LAB refresh failed') } as SituationProps['weather']} />);
  expect(screen.getByTestId('temperature')).toHaveTextContent(/\d+°C/);
  expect(screen.getByText(/อัปเดตไม่สำเร็จ/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^ลองใหม่$/ }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});
