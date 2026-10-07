import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface FitScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  return "#DC4444";
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function FitScoreRing({ score, size = 64, strokeWidth = 5 }: FitScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const color = getScoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#262626"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <Text style={{ color, fontFamily: "GeistMono_700Bold", fontSize: size * 0.28, lineHeight: size * 0.35 }}>
        {score}
      </Text>
    </View>
  );
}

export function ScoreBadge({ score, size = 44 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: color }}>
      <Text style={{ color, fontFamily: "GeistMono_700Bold", fontSize: size * 0.3, lineHeight: size * 0.36 }}>
        {score}
      </Text>
    </View>
  );
}
