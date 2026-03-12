import { FoodItem, FoodType, ZoneId } from '../types';
import { FOOD_RADIUS } from '../constants';

export function createFood(
  id: number,
  x: number,
  y: number,
  zone: ZoneId,
  type: FoodType,
  value: number
): FoodItem {
  return {
    id,
    pos: { x, y },
    type,
    value,
    radius: FOOD_RADIUS,
    collected: false,
    pulsePhase: Math.random() * Math.PI * 2,
    zone,
  };
}
