import React from 'react';
import { Image } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import OnboardingModal from '../OnboardingModal';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

describe('OnboardingModal', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  const getListNode = (root: any) =>
    root.queryAll((node: any) => Array.isArray(node.props?.data))[0];

  const getDots = (root: any) =>
    root.queryAll(
      (node: any) =>
        Array.isArray(node.props?.style) &&
        node.props.style.some((s: any) => s?.borderRadius === 4 && s?.height === 8)
    );

  describe('rendering and visibility', () => {
    it('renders modal with visible=true and slide animation', async () => {
      const { root } = await render(<OnboardingModal visible={true} onDismiss={mockOnDismiss} />);

      expect(root?.props.visible).toBe(true);
      expect(root?.props.animationType).toBe('slide');
      expect(root?.props.transparent).toBe(false);
    });

    it('renders null when visible prop is false', async () => {
      const { toJSON } = await render(
        <OnboardingModal visible={false} onDismiss={mockOnDismiss} />
      );

      expect(toJSON()).toBeNull();
    });

    it('renders SafeAreaView with light background color', async () => {
      const { root } = await render(<OnboardingModal visible={true} onDismiss={mockOnDismiss} />);

      const safeArea = (root as any).children[0];
      expect(safeArea.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: Colors.light.background }),
        ])
      );
    });

    it('renders all slide titles and descriptions', async () => {
      const { getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      expect(getByText(t('onboarding.slide1Title'))).toBeTruthy();
      expect(getByText(t('onboarding.slide1Desc'))).toBeTruthy();
      expect(getByText(t('onboarding.slide2Title'))).toBeTruthy();
      expect(getByText(t('onboarding.slide2Desc'))).toBeTruthy();
      expect(getByText(t('onboarding.slide3Title'))).toBeTruthy();
      expect(getByText(t('onboarding.slide3Desc'))).toBeTruthy();
      expect(getByText(t('onboarding.slide4Title'))).toBeTruthy();
      expect(getByText(t('onboarding.slide4Desc'))).toBeTruthy();
      expect(getByText(t('onboarding.slide5Title'))).toBeTruthy();
      expect(getByText(t('onboarding.slide5Desc'))).toBeTruthy();
    });

    it('renders all 5 slide images with contain resizeMode and defined source', async () => {
      const { root } = await render(<OnboardingModal visible={true} onDismiss={mockOnDismiss} />);

      const images = (root as any).queryAll(
        (node: any) => node.type === Image || node.type === 'Image'
      );
      expect(images.length).toBe(5);
      images.forEach((img: any) => {
        expect(img.props.resizeMode).toBe('contain');
        expect(img.props.source).toBeDefined();
      });
    });

    it('configures FlatList with paging and keyExtractor', async () => {
      const { root } = await render(<OnboardingModal visible={true} onDismiss={mockOnDismiss} />);

      const listNode = getListNode(root);
      expect(listNode.props.horizontal).toBe(true);
      expect(listNode.props.pagingEnabled).toBe(true);
      expect(listNode.props.showsHorizontalScrollIndicator).toBe(false);
      expect(listNode.props.bounces).toBe(false);
      expect(listNode.props.data.length).toBe(5);
      expect(listNode.props.keyExtractor({ id: 'custom-id' })).toBe('custom-id');
    });

    it('provides expected viewability configuration threshold', async () => {
      const { root } = await render(<OnboardingModal visible={true} onDismiss={mockOnDismiss} />);

      const listNode = getListNode(root);
      expect(listNode.props.viewabilityConfigCallbackPairs[0].viewabilityConfig).toEqual({
        viewAreaCoveragePercentThreshold: 50,
      });
    });
  });

  describe('theming', () => {
    it('applies light theme colors to texts, buttons, and dots', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });

      const { root, getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const skipText = getByText(t('onboarding.skip'));
      expect(skipText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.light.textSecondary })])
      );

      const titleText = getByText(t('onboarding.slide1Title'));
      expect(titleText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.light.text })])
      );

      const descText = getByText(t('onboarding.slide1Desc'));
      expect(descText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.light.textSecondary })])
      );

      const dismissBtn = getByText(t('onboarding.dismissBtn')).parent as any;
      expect(dismissBtn?.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.light.primary })])
      );

      const dots = getDots(root);
      expect(dots[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.light.primary })])
      );
      expect(dots[1].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.light.border })])
      );
    });

    it('applies dark theme colors to texts, buttons, background, and dots', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.dark, isDark: true });

      const { root, getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const safeArea = (root as any).children[0];
      expect(safeArea.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: Colors.dark.background }),
        ])
      );

      const skipText = getByText(t('onboarding.skip'));
      expect(skipText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.textSecondary })])
      );

      const titleText = getByText(t('onboarding.slide1Title'));
      expect(titleText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.text })])
      );

      const descText = getByText(t('onboarding.slide1Desc'));
      expect(descText.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.textSecondary })])
      );

      const dismissBtn = getByText(t('onboarding.dismissBtn')).parent as any;
      expect(dismissBtn?.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.dark.primary })])
      );

      const dots = getDots(root);
      expect(dots[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.dark.primary })])
      );
      expect(dots[1].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.dark.border })])
      );
    });
  });

  describe('user interactions and dismissal', () => {
    it('calls onDismiss when pressing the Skip button', async () => {
      const { getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const skipButton = getByText(t('onboarding.skip'));
      fireEvent.press(skipButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when pressing the final Start Climbing button', async () => {
      const { getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const dismissButton = getByText(t('onboarding.dismissBtn'));
      fireEvent.press(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('pagination and slide changes', () => {
    it('renders initial state with active first dot and visible skip button', async () => {
      const { root, getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      expect(getByText(t('onboarding.skip'))).toBeTruthy();

      const dots = getDots(root);
      expect(dots.length).toBe(5);
      expect(dots[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 20 })])
      );
      expect(dots[1].props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 20 })])
      );
    });

    it('updates active dot when changing to slide 2', async () => {
      const { root } = await render(<OnboardingModal visible={true} onDismiss={mockOnDismiss} />);

      const listNode = getListNode(root);
      const onViewableItemsChanged =
        listNode.props.viewabilityConfigCallbackPairs[0].onViewableItemsChanged;

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [{ index: 2 }],
        });
      });

      const dots = getDots(root);
      expect(dots[2].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 20 })])
      );
      expect(dots[0].props.style).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 20 })])
      );
    });

    it('hides the Skip button on the last slide (index 4)', async () => {
      const { root, queryByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const listNode = getListNode(root);
      const onViewableItemsChanged =
        listNode.props.viewabilityConfigCallbackPairs[0].onViewableItemsChanged;

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [{ index: 4 }],
        });
      });

      expect(queryByText(t('onboarding.skip'))).toBeNull();

      const dots = getDots(root);
      expect(dots[4].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 20 })])
      );
    });

    it('restores the Skip button when navigating back from the last slide', async () => {
      const { root, queryByText, getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const listNode = getListNode(root);
      const onViewableItemsChanged =
        listNode.props.viewabilityConfigCallbackPairs[0].onViewableItemsChanged;

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [{ index: 4 }],
        });
      });
      expect(queryByText(t('onboarding.skip'))).toBeNull();

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [{ index: 1 }],
        });
      });
      expect(getByText(t('onboarding.skip'))).toBeTruthy();
    });

    it('falls back to index 0 when viewableItem index is undefined', async () => {
      const { root, getByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const listNode = getListNode(root);
      const onViewableItemsChanged =
        listNode.props.viewabilityConfigCallbackPairs[0].onViewableItemsChanged;

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [{ index: undefined }],
        });
      });

      expect(getByText(t('onboarding.skip'))).toBeTruthy();
      const dots = getDots(root);
      expect(dots[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: 20 })])
      );
    });

    it('does not modify index when viewableItems array is empty', async () => {
      const { root, queryByText } = await render(
        <OnboardingModal visible={true} onDismiss={mockOnDismiss} />
      );

      const listNode = getListNode(root);
      const onViewableItemsChanged =
        listNode.props.viewabilityConfigCallbackPairs[0].onViewableItemsChanged;

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [{ index: 4 }],
        });
      });
      expect(queryByText(t('onboarding.skip'))).toBeNull();

      await act(async () => {
        onViewableItemsChanged({
          viewableItems: [],
        });
      });

      expect(queryByText(t('onboarding.skip'))).toBeNull();
    });
  });
});
