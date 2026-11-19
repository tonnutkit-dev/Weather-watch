import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NowChip, type WeatherState } from '../components/NowChip';
import { normalizeWeather } from '../providers/weather';
import { defaultLocation } from '../locations/provinces';
import fixture from '../../diagnostics-p0/provider-fixtures.json';

it('cached refresh failure retains labeled data and an actionable weather retry', () => {
  const body = structuredClone(fixture.weather.body);
  body.current.time = Math.floor(Date.now() / 1000);
  const data = normalizeWeather(body, defaultLocation);
  const onRefresh = vi.fn();
  render(<NowChip location={defaultLocation} now={Date.now()}
    onSearch={vi.fn()} onRefresh={onRefresh}
    weather={{ data, isError: true, isPending: false, isFetching: false,
      error: new Error('LAB refresh failed') } as WeatherState} />);
  expect(screen.getByTestId('temperature')).toHaveTextContent(/\d+°C/);
  expect(screen.getByText(/อัปเดตไม่สำเร็จ/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^ลองใหม่$/ }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});
