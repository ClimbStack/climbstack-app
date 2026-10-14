import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import BlockChip from '../BlockChip';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors, Spacing, BorderRadius, FontSize } from '../../utils/theme';

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

describe('BlockChip', () => {
  const mockOnPress = jest.fn();

  const defaultProps = {
    name: 'Deep Work',
    categoryColor: '#3B82F6',
    categoryEmoji: 'briefcase',
    durationHours: 2,
    done: false,
    onPress: mockOnPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  const getCategoryIcon = (tree: any) => tree.children[0];

  const getNameRow = (tree: any) => tree.children[1].children[0];

  const getDurationText = (tree: any) => tree.children[2];

  describe('rendering and content', () => {
    it('renders block name and formatted duration hours', async () => {
      const { getByText } = await render(<BlockChip {...defaultProps} />);

      expect(getByText('Deep Work')).toBeTruthy();
      expect(getByText('2h')).toBeTruthy();
    });

    it('enforces single line on name', async () => {
      const { getByText } = await render(<BlockChip {...defaultProps} />);
      const nameElement = getByText('Deep Work');

      expect(nameElement.props.numberOfLines).toBe(1);
    });

    it('formats decimal duration hours correctly', async () => {
      const { getByText } = await render(<BlockChip {...defaultProps} durationHours={1.5} />);

      expect(getByText('1.5h')).toBeTruthy();
    });

    it('applies container chip styles and category border/background colors', async () => {
      const { toJSON } = await render(<BlockChip {...defaultProps} />);
      const tree = toJSON() as any;
      const chipStyle = StyleSheet.flatten(tree.props.style);

      expect(chipStyle.flexDirection).toBe('row');
      expect(chipStyle.alignItems).toBe('center');
      expect(chipStyle.borderLeftWidth).toBe(4);
      expect(chipStyle.borderRadius).toBe(BorderRadius.sm);
      expect(chipStyle.paddingVertical).toBe(Spacing.xs);
      expect(chipStyle.paddingHorizontal).toBe(Spacing.sm);
      expect(chipStyle.marginBottom).toBe(Spacing.xs);
      expect(chipStyle.borderLeftColor).toBe('#3B82F6');
      expect(chipStyle.backgroundColor).toBe('#3B82F620');
      expect(chipStyle.opacity).toBe(1);
    });

    it('renders category icon with category color and expected size', async () => {
      const { toJSON } = await render(<BlockChip {...defaultProps} />);
      const icon = getCategoryIcon(toJSON());

      expect(icon.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#3B82F6', fontSize: 16 }),
          expect.objectContaining({ fontFamily: 'material-community' }),
        ])
      );
    });
  });

  describe('done state', () => {
    it('renders with full opacity, no checkmark, and normal text when done is false', async () => {
      const { toJSON, getByText } = await render(<BlockChip {...defaultProps} done={false} />);
      const tree = toJSON() as any;
      const chipStyle = StyleSheet.flatten(tree.props.style);
      expect(chipStyle.opacity).toBe(1);

      const nameRow = getNameRow(tree);
      expect(nameRow.children.length).toBe(1);

      const nameStyle = StyleSheet.flatten(getByText('Deep Work').props.style);
      expect(nameStyle.textDecorationLine).toBeUndefined();
    });

    it('renders with reduced opacity, check-bold icon, and strikethrough text when done is true', async () => {
      const { toJSON, getByText } = await render(<BlockChip {...defaultProps} done={true} />);
      const tree = toJSON() as any;
      const chipStyle = StyleSheet.flatten(tree.props.style);
      expect(chipStyle.opacity).toBe(0.5);

      const nameRow = getNameRow(tree);
      expect(nameRow.children.length).toBe(2);

      const checkIcon = nameRow.children[0];
      expect(checkIcon.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: Colors.light.success, fontSize: 16 }),
          expect.objectContaining({ fontFamily: 'material-community' }),
        ])
      );

      const nameStyle = StyleSheet.flatten(getByText('Deep Work').props.style);
      expect(nameStyle.textDecorationLine).toBe('line-through');
    });
  });

  describe('description prop', () => {
    it('renders description text with single line limit and italic font style when provided', async () => {
      const { getByText } = await render(
        <BlockChip {...defaultProps} description="Focused coding sprint" />
      );
      const descElement = getByText('Focused coding sprint');

      expect(descElement).toBeTruthy();
      expect(descElement.props.numberOfLines).toBe(1);
      const descStyle = StyleSheet.flatten(descElement.props.style);
      expect(descStyle.fontStyle).toBe('italic');
      expect(descStyle.fontSize).toBe(FontSize.xs);
      expect(descStyle.color).toBe(Colors.light.textSecondary);
    });

    it('does not render description when description is omitted', async () => {
      const { toJSON } = await render(<BlockChip {...defaultProps} />);
      const tree = toJSON() as any;
      const nameContainer = tree.children[1];

      expect(nameContainer.children.length).toBe(1);
    });

    it('does not render description when description is empty string', async () => {
      const { toJSON } = await render(<BlockChip {...defaultProps} description="" />);
      const tree = toJSON() as any;
      const nameContainer = tree.children[1];

      expect(nameContainer.children.length).toBe(1);
    });
  });

  describe('user interactions', () => {
    it('calls onPress when chip is pressed', async () => {
      const { root } = await render(<BlockChip {...defaultProps} />);

      await fireEvent.press(root!);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress when pressing the block name text', async () => {
      const { getByText } = await render(<BlockChip {...defaultProps} />);

      await fireEvent.press(getByText('Deep Work'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('theming', () => {
    it('applies light theme text colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });

      const { toJSON, getByText } = await render(
        <BlockChip {...defaultProps} done={true} description="Light task" />
      );
      const tree = toJSON() as any;

      const nameStyle = StyleSheet.flatten(getByText('Deep Work').props.style);
      expect(nameStyle.color).toBe(Colors.light.text);

      const descStyle = StyleSheet.flatten(getByText('Light task').props.style);
      expect(descStyle.color).toBe(Colors.light.textSecondary);

      const durationNode = getDurationText(tree);
      const durationStyle = StyleSheet.flatten(durationNode.props.style);
      expect(durationStyle.color).toBe(Colors.light.textSecondary);

      const checkIcon = getNameRow(tree).children[0];
      expect(checkIcon.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.light.success })])
      );
    });

    it('applies dark theme text colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.dark, isDark: true });

      const { toJSON, getByText } = await render(
        <BlockChip {...defaultProps} done={true} description="Dark task" />
      );
      const tree = toJSON() as any;

      const nameStyle = StyleSheet.flatten(getByText('Deep Work').props.style);
      expect(nameStyle.color).toBe(Colors.dark.text);

      const descStyle = StyleSheet.flatten(getByText('Dark task').props.style);
      expect(descStyle.color).toBe(Colors.dark.textSecondary);

      const durationNode = getDurationText(tree);
      const durationStyle = StyleSheet.flatten(durationNode.props.style);
      expect(durationStyle.color).toBe(Colors.dark.textSecondary);

      const checkIcon = getNameRow(tree).children[0];
      expect(checkIcon.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.success })])
      );
    });
  });
});
