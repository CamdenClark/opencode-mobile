import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const BOX_COUNT = 4;
const BOX_SIZE = 8;
const BOX_GAP = 4;
const CYCLE_DURATION = 1200;

interface LoadingIndicatorProps {
  color?: string;
}

export function LoadingIndicator({ color = '#007AFF' }: LoadingIndicatorProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_DURATION, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  return (
    <View style={styles.container}>
      {Array.from({ length: BOX_COUNT }).map((_, i) => (
        <AnimatedBox key={i} index={i} progress={progress} color={color} />
      ))}
    </View>
  );
}

function AnimatedBox({
  index,
  progress,
  color,
}: {
  index: number;
  progress: Animated.SharedValue<number>;
  color: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    // Each box lights up in sequence, creating a snake effect
    // The "active" position sweeps from 0 to BOX_COUNT-1 and back
    const cycle = progress.value * 2; // 0 to 2
    const pos = cycle <= 1 ? cycle * (BOX_COUNT - 1) : (2 - cycle) * (BOX_COUNT - 1);
    const distance = Math.abs(pos - index);
    const opacity = Math.max(0.15, 1 - distance * 0.4);

    return {
      opacity,
      backgroundColor: color,
      transform: [{ scale: 0.85 + opacity * 0.15 }],
    };
  });

  return <Animated.View style={[styles.box, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BOX_GAP,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 2,
  },
});
