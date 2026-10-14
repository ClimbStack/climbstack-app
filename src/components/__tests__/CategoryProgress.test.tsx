import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import CategoryProgress from '../CategoryProgress';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors, Spacing, BorderRadius } from '../../utils/theme';

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

describe('CategoryProgress', () => {
  const defaultProps = {
    emoji: 'briefcase',
    name: 'Work',
    scheduled: 5,
    completed: 3,
    target: 10,
    color: '#3B82F6',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  const getTrackFills = (tree: any) => {
    const trackNode = tree.children[1];
    return {
      track: trackNode,
      scheduledFill: trackNode.children[0],
      completedFill: trackNode.children[1],
    };
  };

  const getIcon = (tree: any) => {
    return tree.children[0].children[0].children[0];
  };

  describe('rendering and content', () => {
    it('renders category name with single line limit', async () => {
      const { getByText } = await render(<CategoryProgress {...defaultProps} />);
      const nameElement = getByText('Work');

      expect(nameElement).toBeTruthy();
      expect(nameElement.props.numberOfLines).toBe(1);
    });

    it('renders hours text formatted as completed/target', async () => {
      const { getByText } = await render(
        <CategoryProgress {...defaultProps} completed={4} target={8} />
      );

      expect(getByText('4/8h')).toBeTruthy();
    });

    it('renders icon with expected vector font family, size, and category color', async () => {
      const { toJSON } = await render(<CategoryProgress {...defaultProps} />);
      const icon = getIcon(toJSON());

      expect(icon.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#3B82F6', fontSize: 18 }),
          expect.objectContaining({ fontFamily: 'material-community' }),
        ])
      );
    });

    it('updates icon color when color prop changes', async () => {
      const { toJSON } = await render(<CategoryProgress {...defaultProps} color="#10B981" />);
      const icon = getIcon(toJSON());

      expect(icon.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#10B981', fontSize: 18 })])
      );
    });

    it('applies container layout styling', async () => {
      const { toJSON } = await render(<CategoryProgress {...defaultProps} />);
      const tree = toJSON() as any;
      const flattenedStyle = StyleSheet.flatten(tree.props.style);

      expect(flattenedStyle.width).toBe(160);
      expect(flattenedStyle.borderRadius).toBe(BorderRadius.sm);
      expect(flattenedStyle.padding).toBe(Spacing.sm);
    });

    it('applies track and fill base layout styling', async () => {
      const { toJSON } = await render(<CategoryProgress {...defaultProps} />);
      const { track, scheduledFill, completedFill } = getTrackFills(toJSON());

      const trackStyle = StyleSheet.flatten(track.props.style);
      expect(trackStyle.height).toBe(6);
      expect(trackStyle.borderRadius).toBe(BorderRadius.full);
      expect(trackStyle.overflow).toBe('hidden');

      const scheduledStyle = StyleSheet.flatten(scheduledFill.props.style);
      expect(scheduledStyle.position).toBe('absolute');
      expect(scheduledStyle.top).toBe(0);
      expect(scheduledStyle.left).toBe(0);
      expect(scheduledStyle.height).toBe('100%');
      expect(scheduledStyle.borderRadius).toBe(BorderRadius.full);

      const completedStyle = StyleSheet.flatten(completedFill.props.style);
      expect(completedStyle.position).toBe('absolute');
      expect(completedStyle.top).toBe(0);
      expect(completedStyle.left).toBe(0);
      expect(completedStyle.height).toBe('100%');
      expect(completedStyle.borderRadius).toBe(BorderRadius.full);
    });
  });

  describe('progress bar widths and edge cases', () => {
    it('calculates proportional widths for partial progress', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} scheduled={6} completed={3} target={10} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('60%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('30%');
    });

    it('renders 0% width when scheduled and completed are zero', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} scheduled={0} completed={0} target={10} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('0%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('0%');
    });

    it('caps progress at 100% when values exceed target', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} scheduled={15} completed={12} target={10} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('100%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('100%');
    });

    it('rounds ratio percentages to the nearest integer', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} scheduled={1} completed={2} target={3} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('33%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('67%');
    });

    it('handles decimal hours appropriately', async () => {
      const { toJSON, getByText } = await render(
        <CategoryProgress {...defaultProps} scheduled={2.5} completed={1.25} target={5} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(getByText('1.25/5h')).toBeTruthy();
      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('50%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('25%');
    });

    it('handles completed exceeding scheduled hours', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} scheduled={2} completed={4} target={5} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('40%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('80%');
    });

    it('handles target = 0 safely with 0% width and does not mark reachedTarget', async () => {
      const { toJSON, getByText } = await render(
        <CategoryProgress
          {...defaultProps}
          scheduled={5}
          completed={5}
          target={0}
          color="#3B82F6"
        />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(getByText('5/0h')).toBeTruthy();
      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('0%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('0%');
      expect(StyleSheet.flatten(completedFill.props.style).backgroundColor).toBe('#3B82F6');
    });

    it('handles negative target safely with 0% width', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} scheduled={2} completed={1} target={-5} />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('0%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('0%');
    });
  });

  describe('target reached status and fill colors', () => {
    it('uses category color when target is not reached', async () => {
      const { toJSON } = await render(
        <CategoryProgress
          {...defaultProps}
          scheduled={5}
          completed={4}
          target={10}
          color="#3B82F6"
        />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).backgroundColor).toBe('#3B82F640');
      expect(StyleSheet.flatten(completedFill.props.style).backgroundColor).toBe('#3B82F6');
    });

    it('retains category color when scheduled meets target but completed does not', async () => {
      const { toJSON } = await render(
        <CategoryProgress
          {...defaultProps}
          scheduled={10}
          completed={8}
          target={10}
          color="#3B82F6"
        />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).width).toBe('100%');
      expect(StyleSheet.flatten(completedFill.props.style).width).toBe('80%');
      expect(StyleSheet.flatten(scheduledFill.props.style).backgroundColor).toBe('#3B82F640');
      expect(StyleSheet.flatten(completedFill.props.style).backgroundColor).toBe('#3B82F6');
    });

    it('uses success color when completed exactly equals target', async () => {
      const { toJSON } = await render(
        <CategoryProgress
          {...defaultProps}
          scheduled={10}
          completed={10}
          target={10}
          color="#3B82F6"
        />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).backgroundColor).toBe(
        Colors.light.success + '40'
      );
      expect(StyleSheet.flatten(completedFill.props.style).backgroundColor).toBe(
        Colors.light.success
      );
    });

    it('uses success color when completed exceeds target', async () => {
      const { toJSON } = await render(
        <CategoryProgress
          {...defaultProps}
          scheduled={15}
          completed={12}
          target={10}
          color="#3B82F6"
        />
      );
      const { scheduledFill, completedFill } = getTrackFills(toJSON());

      expect(StyleSheet.flatten(scheduledFill.props.style).backgroundColor).toBe(
        Colors.light.success + '40'
      );
      expect(StyleSheet.flatten(completedFill.props.style).backgroundColor).toBe(
        Colors.light.success
      );
    });

    it('maintains icon color even when target is reached', async () => {
      const { toJSON } = await render(
        <CategoryProgress {...defaultProps} completed={10} target={10} color="#9333EA" />
      );
      const icon = getIcon(toJSON());

      expect(icon.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#9333EA' })])
      );
    });
  });

  describe('theming', () => {
    it('applies light theme surface, text, and track colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });

      const { toJSON, getByText } = await render(<CategoryProgress {...defaultProps} />);
      const tree = toJSON() as any;

      const containerStyle = StyleSheet.flatten(tree.props.style);
      expect(containerStyle.backgroundColor).toBe(Colors.light.surface);

      const nameStyle = StyleSheet.flatten(getByText('Work').props.style);
      expect(nameStyle.color).toBe(Colors.light.text);

      const hoursStyle = StyleSheet.flatten(getByText('3/10h').props.style);
      expect(hoursStyle.color).toBe(Colors.light.textSecondary);

      const trackNode = tree.children[1];
      const trackStyle = StyleSheet.flatten(trackNode.props.style);
      expect(trackStyle.backgroundColor).toBe(Colors.light.surfaceAlt);
    });

    it('applies dark theme surface, text, track, and success colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.dark, isDark: true });

      const { toJSON, getByText } = await render(
        <CategoryProgress {...defaultProps} completed={10} target={10} />
      );
      const tree = toJSON() as any;

      const containerStyle = StyleSheet.flatten(tree.props.style);
      expect(containerStyle.backgroundColor).toBe(Colors.dark.surface);

      const nameStyle = StyleSheet.flatten(getByText('Work').props.style);
      expect(nameStyle.color).toBe(Colors.dark.text);

      const hoursStyle = StyleSheet.flatten(getByText('10/10h').props.style);
      expect(hoursStyle.color).toBe(Colors.dark.textSecondary);

      const trackNode = tree.children[1];
      const trackStyle = StyleSheet.flatten(trackNode.props.style);
      expect(trackStyle.backgroundColor).toBe(Colors.dark.surfaceAlt);

      const { completedFill } = getTrackFills(tree);
      expect(StyleSheet.flatten(completedFill.props.style).backgroundColor).toBe(
        Colors.dark.success
      );
    });
  });
});
