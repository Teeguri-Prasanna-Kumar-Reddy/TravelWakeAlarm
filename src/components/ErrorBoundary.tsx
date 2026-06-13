import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Button from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. The app has recovered to prevent closing.
            </Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{this.state.error?.message}</Text>
            </View>
            <Button title="Try Again" onPress={this.handleReset} />
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  title: {
    fontSize: 24,
    color: COLORS.danger,
    fontFamily: FONTS.bold,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    fontFamily: FONTS.regular,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 8, 68, 0.1)',
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 8, 68, 0.3)',
    marginBottom: SIZES.xl,
    width: '100%',
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
