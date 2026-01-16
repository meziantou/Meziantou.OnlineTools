using Meziantou.Framework;

namespace Meziantou.OnlineTools.Utils;

public sealed record CharInfoWrapper(UnicodeCharacterInfo CharInfo)
{
    public string DisplayValue => CharInfo.Rune.ToString();
    public string DisplayCodePoint => "U+" + CharInfo.Rune.Value.ToString("X4", CultureInfo.InvariantCulture);
    public string Category => CharInfo.Category.ToString();
    public string? Block => CharInfo.Block?.Name;
    public string Name => CharInfo.Name ?? CharInfo.Unicode1Name ?? "";
    public string Escape => GetEscapeString(CharInfo.Rune.Value);

    private static string GetEscapeString(int value)
    {
        if (char.ConvertFromUtf32(value).Length is 2)
        {
            return "\\U" + value.ToString("X", CultureInfo.InvariantCulture).PadLeft(8, '0');
        }
        else
        {
            return "\\u" + value.ToString("X", CultureInfo.InvariantCulture).PadLeft(4, '0');
        }
    }

    public static CharInfoWrapper Create(char c)
    {
        var info = Unicode.GetCharacterInfo(c);
        if (info != null)
            return new CharInfoWrapper(info.Value);
        return new CharInfoWrapper(default(UnicodeCharacterInfo));
    }

    public static CharInfoWrapper Create(Rune c)
    {
        var info = Unicode.GetCharacterInfo(c);
        if (info != null)
            return new CharInfoWrapper(info.Value);
        return new CharInfoWrapper(default(UnicodeCharacterInfo));
    }
}
