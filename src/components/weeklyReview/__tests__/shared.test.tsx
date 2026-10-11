import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useThemeColors } from '../../../utils/useThemeColors';
import { Colors } from '../../../utils/theme';
import {
  Card,
  Section,
  IconRow,
  MIN_TOUCH_TARGET,
  TINT_ALPHA,
  SECTION_ICON_SIZE,
  ROW_ICON_SIZE,
} from '../shared';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

describe('weeklyReview/shared', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  describe('constants', () => {
    it('exports expected constant values', () => {
      expect(MIN_TOUCH_TARGET).toBe(44);
      expect(TINT_ALPHA).toBe('20');
      expect(SECTION_ICON_SIZE).toBe(22);
      expect(ROW_ICON_SIZE).toBe(18);
    });
  });

  describe('Card', () => {
    it('renders children', async () => {
      const { getByText } = await render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );

      expect(getByText('Card Content')).toBeTruthy();
    });
  });

  describe('Section', () => {
    it('renders title and children', async () => {
      const { getByText } = await render(
        <Section icon="star" iconColor="#FFD700" title="Test Section">
          <Text>Section Body</Text>
        </Section>
      );

      expect(getByText('Test Section')).toBeTruthy();
      expect(getByText('Section Body')).toBeTruthy();
    });

    it('applies header accessibility role', async () => {
      const { getByRole } = await render(
        <Section icon="star" iconColor="#FFD700" title="Accessible Title">
          <Text>Content</Text>
        </Section>
      );

      expect(getByRole('header')).toBeTruthy();
    });
  });

  describe('IconRow', () => {
    it('renders the text', async () => {
      const { getByText } = await render(
        <IconRow icon="check" color="#00FF00" text="Completed task" />
      );

      expect(getByText('Completed task')).toBeTruthy();
    });

    it('respects maxLines prop', async () => {
      const { getByText } = await render(
        <IconRow icon="check" color="#00FF00" text="Long text" maxLines={1} />
      );

      expect(getByText('Long text').props.numberOfLines).toBe(1);
    });

    it('does not set numberOfLines when maxLines is omitted', async () => {
      const { getByText } = await render(<IconRow icon="check" color="#00FF00" text="No limit" />);

      expect(getByText('No limit').props.numberOfLines).toBeUndefined();
    });
  });
});
