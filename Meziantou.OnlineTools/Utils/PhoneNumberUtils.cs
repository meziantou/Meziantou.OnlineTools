using System.Text;

namespace Meziantou.OnlineTools.Utils;

internal static class PhoneNumberUtils
{
    // ITU E.161 / ISO 9995-8 keypad layout
    private static ReadOnlySpan<char> Keypad => "22233344455566677778889999";

    public static char? GetDigit(char character)
    {
        if (character is >= 'A' and <= 'Z')
            return Keypad[character - 'A'];

        if (character is >= 'a' and <= 'z')
            return Keypad[character - 'a'];

        return null;
    }

    /// <summary>
    /// Replaces the letters of a vanity phone number by their keypad digit, keeping the original formatting.
    /// </summary>
    public static string ToPhoneNumber(string text)
    {
        if (string.IsNullOrEmpty(text))
            return string.Empty;

        return string.Create(text.Length, text, static (span, value) =>
        {
            for (var i = 0; i < value.Length; i++)
            {
                var character = value[i];
                span[i] = GetDigit(character) ?? character;
            }
        });
    }

    /// <summary>
    /// Replaces the letters of a vanity phone number by their keypad digit and removes the formatting characters.
    /// </summary>
    public static string ToDigitsOnly(string text)
    {
        if (string.IsNullOrEmpty(text))
            return string.Empty;

        var result = new StringBuilder(text.Length);
        foreach (var character in text)
        {
            if (char.IsAsciiDigit(character))
            {
                result.Append(character);
            }
            else if (GetDigit(character) is char digit)
            {
                result.Append(digit);
            }
            else if (character is '+' && result.Length is 0)
            {
                result.Append(character);
            }
        }

        return result.ToString();
    }
}
