import React from 'react';
import { StyleSheet, Platform, KeyboardAvoidingView, FlatList } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import IconPicker from '../IconPicker';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors, Spacing, BorderRadius } from '../../utils/theme';
import * as i18nModule from '../../utils/i18n';
import { t } from '../../utils/i18n';

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

describe('IconPicker', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();
  const originalPlatform = Platform.OS;

  let capturedKavProps: any = null;
  let capturedFlatListProps: any = null;
  let kavSpy: jest.SpyInstance;
  let flatListSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
      configurable: true,
    });

    capturedKavProps = null;
    const origKavRender = KeyboardAvoidingView.prototype.render;
    kavSpy = jest.spyOn(KeyboardAvoidingView.prototype, 'render').mockImplementation(function (
      this: any
    ) {
      capturedKavProps = this.props;
      return origKavRender.call(this);
    });

    capturedFlatListProps = null;
    const origFlatListRender = FlatList.prototype.render;
    flatListSpy = jest.spyOn(FlatList.prototype, 'render').mockImplementation(function (this: any) {
      capturedFlatListProps = this.props;
      return origFlatListRender.call(this);
    });
  });

  afterEach(() => {
    kavSpy?.mockRestore();
    flatListSpy?.mockRestore();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  const getPickerElements = (getByText: any) => {
    const title = getByText(t('manage.selectIcon'));
    const content = title.parent as any;
    const keyboardAvoidingView = content.parent as any;
    const modal = keyboardAvoidingView.parent as any;
    const searchInput = content.children[1] as any;
    const flatList = content.children[2] as any;
    const closeButton = content.children[3] as any;

    return {
      title,
      content,
      keyboardAvoidingView,
      modal,
      searchInput,
      flatList,
      closeButton,
    };
  };

  const getIconCells = (root: any) =>
    (root as any).queryAll(
      (node: any) => node.props?.style && StyleSheet.flatten(node.props.style)?.aspectRatio === 1
    );

  describe('rendering and visibility', () => {
    it('renders modal with visible=true, transparent=true, and slide animation', async () => {
      const { getByText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const { modal } = getPickerElements(getByText);

      expect(modal.props.visible).toBe(true);
      expect(modal.props.transparent).toBe(true);
      expect(modal.props.animationType).toBe('slide');
    });

    it('renders null or invisible modal when visible prop is false', async () => {
      const { toJSON, queryByText } = await render(
        <IconPicker visible={false} onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      const title = queryByText(t('manage.selectIcon'));
      if (title) {
        const { modal } = getPickerElements(queryByText);
        expect(modal.props.visible).toBe(false);
      } else {
        expect(toJSON()).toBeNull();
      }
    });

    it('renders header title and cancel button text using localization', async () => {
      const { getByText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(getByText(t('manage.selectIcon'))).toBeTruthy();
      expect(getByText(t('common.cancel'))).toBeTruthy();
    });

    it('configures search TextInput with expected attributes', async () => {
      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));

      expect(searchInput.props.value).toBe('');
      expect(searchInput.props.autoCorrect).toBe(false);
      expect(searchInput.props.autoCapitalize).toBe('none');
    });

    it('falls back to "Search" placeholder when localized string is empty', async () => {
      const spy = jest.spyOn(i18nModule, 't').mockImplementation((key: string) => {
        if (key === 'manage.searchIcon') return '';
        if (key === 'manage.selectIcon') return 'Select an icon';
        return key;
      });

      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(getByPlaceholderText('Search')).toBeTruthy();
      spy.mockRestore();
    });

    it('configures FlatList with 5 columns, keyExtractor, and row style', async () => {
      await render(<IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />);

      expect(capturedFlatListProps.numColumns).toBe(5);
      expect(capturedFlatListProps.keyExtractor('star')).toBe('star');
      expect(capturedFlatListProps.data.length).toBeGreaterThan(50);
      expect(capturedFlatListProps.columnWrapperStyle).toBeDefined();
    });

    it('applies layout styling to content container', async () => {
      const { getByText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const { content } = getPickerElements(getByText);
      const contentStyle = StyleSheet.flatten(content.props.style);

      expect(contentStyle.height).toBe('70%');
      expect(contentStyle.borderTopLeftRadius).toBe(BorderRadius.xl);
      expect(contentStyle.borderTopRightRadius).toBe(BorderRadius.xl);
      expect(contentStyle.padding).toBe(Spacing.lg);
    });
  });

  describe('platform keyboard avoiding behavior', () => {
    it('uses height behavior on Android', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
        configurable: true,
      });

      await render(<IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />);

      expect(capturedKavProps.behavior).toBe('height');
    });

    it('uses padding behavior on iOS', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      await render(<IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />);

      expect(capturedKavProps.behavior).toBe('padding');
    });
  });

  describe('search filtering', () => {
    it('filters icons matching query', async () => {
      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));

      await fireEvent.changeText(searchInput, 'star');

      expect(capturedFlatListProps.data).toEqual(['star']);
    });

    it('performs case-insensitive search filtering', async () => {
      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));

      await fireEvent.changeText(searchInput, 'STAR');

      expect(capturedFlatListProps.data).toEqual(['star']);
    });

    it('matches partial substrings across icon names', async () => {
      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));

      await fireEvent.changeText(searchInput, 'code');

      expect(capturedFlatListProps.data).toEqual(['code-braces', 'code-tags']);
    });

    it('returns empty list when no icons match the query', async () => {
      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));

      await fireEvent.changeText(searchInput, 'unmatchedqueryxyz');

      expect(capturedFlatListProps.data).toEqual([]);
    });

    it('restores all icons when search is cleared', async () => {
      const { getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const totalCount = capturedFlatListProps.data.length;
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));

      await fireEvent.changeText(searchInput, 'music');
      expect(capturedFlatListProps.data.length).toBe(1);

      await fireEvent.changeText(searchInput, '');
      expect(capturedFlatListProps.data.length).toBe(totalCount);
    });
  });

  describe('user interactions', () => {
    it('calls onSelect with the selected icon when an icon cell is pressed', async () => {
      const { root, getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const searchInput = getByPlaceholderText(t('manage.searchIcon'));
      await fireEvent.changeText(searchInput, 'heart');

      const iconCells = getIconCells(root);
      expect(iconCells.length).toBeGreaterThan(0);
      await fireEvent.press(iconCells[0]);

      expect(mockOnSelect).toHaveBeenCalledWith('heart');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the cancel button is pressed', async () => {
      const { getByText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const cancelBtn = getByText(t('common.cancel'));

      await fireEvent.press(cancelBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when onRequestClose is triggered by the Modal', async () => {
      const { getByText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const { modal } = getPickerElements(getByText);

      modal.props.onRequestClose();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('theming', () => {
    it('applies light theme surface, background, and text colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });

      const { root, getByText, getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const { content, keyboardAvoidingView } = getPickerElements(getByText);

      expect(StyleSheet.flatten(keyboardAvoidingView.props.style).backgroundColor).toBe(
        Colors.light.overlay
      );

      expect(StyleSheet.flatten(content.props.style).backgroundColor).toBe(Colors.light.surface);

      const title = getByText(t('manage.selectIcon'));
      expect(StyleSheet.flatten(title.props.style).color).toBe(Colors.light.text);

      const searchInput = getByPlaceholderText(t('manage.searchIcon'));
      const searchStyle = StyleSheet.flatten(searchInput.props.style);
      expect(searchStyle.backgroundColor).toBe(Colors.light.background);
      expect(searchStyle.color).toBe(Colors.light.text);
      expect(searchStyle.borderColor).toBe(Colors.light.border);
      expect(searchInput.props.placeholderTextColor).toBe(Colors.light.textSecondary);

      const cancelText = getByText(t('common.cancel'));
      expect(StyleSheet.flatten(cancelText.props.style).color).toBe(Colors.light.textSecondary);

      const iconCells = getIconCells(root);
      expect(iconCells.length).toBeGreaterThan(0);
      const cellStyle = StyleSheet.flatten(iconCells[0].props.style);
      expect(cellStyle.backgroundColor).toBe(Colors.light.surfaceAlt);

      const iconNode = iconCells[0].children[0];
      expect(iconNode.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.light.text })])
      );
    });

    it('applies dark theme surface, background, and text colors', async () => {
      mockUseThemeColors.mockReturnValue({ colors: Colors.dark, isDark: true });

      const { root, getByText, getByPlaceholderText } = await render(
        <IconPicker visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
      );
      const { content, keyboardAvoidingView } = getPickerElements(getByText);

      expect(StyleSheet.flatten(keyboardAvoidingView.props.style).backgroundColor).toBe(
        Colors.dark.overlay
      );

      expect(StyleSheet.flatten(content.props.style).backgroundColor).toBe(Colors.dark.surface);

      const title = getByText(t('manage.selectIcon'));
      expect(StyleSheet.flatten(title.props.style).color).toBe(Colors.dark.text);

      const searchInput = getByPlaceholderText(t('manage.searchIcon'));
      const searchStyle = StyleSheet.flatten(searchInput.props.style);
      expect(searchStyle.backgroundColor).toBe(Colors.dark.background);
      expect(searchStyle.color).toBe(Colors.dark.text);
      expect(searchStyle.borderColor).toBe(Colors.dark.border);
      expect(searchInput.props.placeholderTextColor).toBe(Colors.dark.textSecondary);

      const cancelText = getByText(t('common.cancel'));
      expect(StyleSheet.flatten(cancelText.props.style).color).toBe(Colors.dark.textSecondary);

      const iconCells = getIconCells(root);
      expect(iconCells.length).toBeGreaterThan(0);
      const cellStyle = StyleSheet.flatten(iconCells[0].props.style);
      expect(cellStyle.backgroundColor).toBe(Colors.dark.surfaceAlt);

      const iconNode = iconCells[0].children[0];
      expect(iconNode.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: Colors.dark.text })])
      );
    });
  });
});
