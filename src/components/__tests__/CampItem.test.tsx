import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import CampItem from '../CampItem';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors, Spacing, BorderRadius, FontSize } from '../../utils/theme';
import type { Camp } from '../../types';

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

describe('CampItem', () => {
  const defaultCamp: Camp = {
    id: 'camp-1',
    name: 'Base Camp',
    done: false,
    order: 0,
  };

  const mockOnToggle = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  const getContainerChildren = (root: any) => {
    let node = root;
    while (node && node.children && node.children.length === 1 && node.children[0].children) {
      if (node.children[0].children.length > 1) {
        return node.children[0].children;
      }
      node = node.children[0];
    }
    return node?.children || [];
  };

  describe('rendering and content', () => {
    it('renders camp name with single line limit', async () => {
      const { getByText } = await render(
        <CampItem camp={defaultCamp} onToggle={mockOnToggle} onDelete={mockOnDelete} />
      );
      const nameElement = getByText('Base Camp');

      expect(nameElement).toBeTruthy();
      expect(nameElement.props.numberOfLines).toBe(1);
    });

    it('applies container layout styling', async () => {
      const { toJSON } = await render(
        <CampItem camp={defaultCamp} onToggle={mockOnToggle} onDelete={mockOnDelete} />
      );
      const tree = toJSON() as any;
      const flattenedStyle = StyleSheet.flatten(tree.props.style);

      expect(flattenedStyle.flexDirection).toBe('row');
      expect(flattenedStyle.alignItems).toBe('center');
      expect(flattenedStyle.paddingVertical).toBe(Spacing.sm);
      expect(flattenedStyle.paddingHorizontal).toBe(Spacing.md);
      expect(flattenedStyle.borderRadius).toBe(BorderRadius.sm);
      expect(flattenedStyle.borderWidth).toBe(1);
      expect(flattenedStyle.marginBottom).toBe(Spacing.sm);
    });
  });

  describe('incomplete state', () => {
    it('does not render checkmark text when done is false', async () => {
      const { queryByText } = await render(
        <CampItem
          camp={{ ...defaultCamp, done: false }}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
        />
      );

      expect(queryByText('✓')).toBeNull();
    });

    it('applies incomplete styling to checkbox and name', async () => {
      const { getByText, toJSON } = await render(
        <CampItem
          camp={{ ...defaultCamp, done: false }}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
        />
      );
      const tree = toJSON() as any;
      const checkboxView = tree.children[0].children[0];
      const checkboxStyle = StyleSheet.flatten(checkboxView.props.style);

      expect(checkboxStyle.borderColor).toBe(Colors.light.textTertiary);
      expect(checkboxStyle.backgroundColor).toBe('transparent');

      const nameElement = getByText('Base Camp');
      const nameStyle = StyleSheet.flatten(nameElement.props.style);
      expect(nameStyle.color).toBe(Colors.light.text);
      expect(nameStyle.textDecorationLine).toBeUndefined();
    });
  });

  describe('completed state', () => {
    it('renders checkmark text when done is true', async () => {
      const { getByText } = await render(
        <CampItem
          camp={{ ...defaultCamp, done: true }}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
        />
      );
      const checkmark = getByText('✓');

      expect(checkmark).toBeTruthy();
      const checkmarkStyle = StyleSheet.flatten(checkmark.props.style);
      expect(checkmarkStyle.color).toBe('#FFFFFF');
      expect(checkmarkStyle.fontSize).toBe(FontSize.sm);
      expect(checkmarkStyle.fontWeight).toBe('700');
      expect(checkmarkStyle.lineHeight).toBe(FontSize.sm);
    });

    it('applies completed styling to checkbox and strikethrough to name', async () => {
      const { getByText, toJSON } = await render(
        <CampItem
          camp={{ ...defaultCamp, done: true }}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
        />
      );
      const tree = toJSON() as any;
      const checkboxView = tree.children[0].children[0];
      const checkboxStyle = StyleSheet.flatten(checkboxView.props.style);

      expect(checkboxStyle.borderColor).toBe(Colors.light.success);
      expect(checkboxStyle.backgroundColor).toBe(Colors.light.success);

      const nameElement = getByText('Base Camp');
      const nameStyle = StyleSheet.flatten(nameElement.props.style);
      expect(nameStyle.color).toBe(Colors.light.textTertiary);
      expect(nameStyle.textDecorationLine).toBe('line-through');
    });
  });

  describe('edit action', () => {
    it('renders edit button with pencil icon when onEdit is provided', async () => {
      const { toJSON } = await render(
        <CampItem
          camp={defaultCamp}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
        />
      );
      const tree = toJSON() as any;
      expect(tree.children.length).toBe(4);

      const editButton = tree.children[2];
      const pencilIcon = editButton.children[0];
      expect(pencilIcon.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: Colors.light.textTertiary, fontSize: 18 }),
          expect.objectContaining({ fontFamily: 'material-community' }),
        ])
      );
    });

    it('does not render edit button when onEdit is omitted', async () => {
      const { toJSON } = await render(
        <CampItem camp={defaultCamp} onToggle={mockOnToggle} onDelete={mockOnDelete} />
      );
      const tree = toJSON() as any;
      expect(tree.children.length).toBe(3);
    });
  });

  describe('delete action', () => {
    it('always renders delete button with trash icon', async () => {
      const { toJSON } = await render(
        <CampItem camp={defaultCamp} onToggle={mockOnToggle} onDelete={mockOnDelete} />
      );
      const tree = toJSON() as any;
      const deleteButton = tree.children[2];
      const trashIcon = deleteButton.children[0];

      expect(trashIcon.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: Colors.light.danger, fontSize: 18 }),
          expect.objectContaining({ fontFamily: 'material-community' }),
        ])
      );
    });
  });

  describe('user interactions', () => {
    it('calls onToggle when pressing checkbox area', async () => {
      const { root } = await render(
        <CampItem camp={defaultCamp} onToggle={mockOnToggle} onDelete={mockOnDelete} />
      );
      const children = getContainerChildren(root);
      const checkboxTouchable = children[0];

      await fireEvent.press(checkboxTouchable);
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onEdit when pressing edit button', async () => {
      const { root } = await render(
        <CampItem
          camp={defaultCamp}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
        />
      );
      const children = getContainerChildren(root);
      const editTouchable = children[2];

      await fireEvent.press(editTouchable);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when pressing delete button', async () => {
      const { root } = await render(
        <CampItem
          camp={defaultCamp}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
        />
      );
      const children = getContainerChildren(root);
      const deleteTouchable = children[3];

      await fireEvent.press(deleteTouchable);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when pressing delete button without onEdit provided', async () => {
      const { root } = await render(
        <CampItem camp={defaultCamp} onToggle={mockOnToggle} onDelete={mockOnDelete} />
      );
      const children = getContainerChildren(root);
      const deleteTouchable = children[2];

      await fireEvent.press(deleteTouchable);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('theming', () => {
    it('applies light theme surface, border, and text colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });

      const { toJSON, getByText } = await render(
        <CampItem
          camp={defaultCamp}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
        />
      );
      const tree = toJSON() as any;
      const containerStyle = StyleSheet.flatten(tree.props.style);

      expect(containerStyle.backgroundColor).toBe(Colors.light.surface);
      expect(containerStyle.borderColor).toBe(Colors.light.border);

      const nameStyle = StyleSheet.flatten(getByText('Base Camp').props.style);
      expect(nameStyle.color).toBe(Colors.light.text);
    });

    it('applies dark theme surface, border, text, and icon colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.dark, isDark: true });

      const { toJSON, getByText } = await render(
        <CampItem
          camp={{ ...defaultCamp, done: true }}
          onToggle={mockOnToggle}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
        />
      );
      const tree = toJSON() as any;
      const containerStyle = StyleSheet.flatten(tree.props.style);

      expect(containerStyle.backgroundColor).toBe(Colors.dark.surface);
      expect(containerStyle.borderColor).toBe(Colors.dark.border);

      const nameStyle = StyleSheet.flatten(getByText('Base Camp').props.style);
      expect(nameStyle.color).toBe(Colors.dark.textTertiary);

      const checkboxView = tree.children[0].children[0];
      const checkboxStyle = StyleSheet.flatten(checkboxView.props.style);
      expect(checkboxStyle.borderColor).toBe(Colors.dark.success);
      expect(checkboxStyle.backgroundColor).toBe(Colors.dark.success);

      const pencilIcon = tree.children[2].children[0];
      const trashIcon = tree.children[3].children[0];

      expect(pencilIcon.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.textTertiary })])
      );
      expect(trashIcon.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.danger })])
      );
    });
  });
});
