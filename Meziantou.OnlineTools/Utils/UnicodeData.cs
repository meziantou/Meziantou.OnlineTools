using System.Diagnostics;
using Meziantou.Framework;

namespace Meziantou.OnlineTools.Utils;

public static class UnicodeData
{
    public static ICollection<CharInfoWrapper> GetData(string search)
    {
        if (search.Length == 0)
            return Array.Empty<CharInfoWrapper>();

        if (search.Length == 1)
            return [CharInfoWrapper.Create(search[0])];

        if (search.Length == 2 && char.IsHighSurrogate(search[0]) && char.IsLowSurrogate(search[1]))
            return [CharInfoWrapper.Create(new Rune(search[0], search[1]))];

        int code;
        if (search.StartsWith("\\u", StringComparison.OrdinalIgnoreCase) || search.StartsWith("U+", StringComparison.OrdinalIgnoreCase) || search.StartsWith("&#", StringComparison.OrdinalIgnoreCase))
        {
            var value = search[2..];
            if (int.TryParse(value, NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out code))
                return [CharInfoWrapper.Create(new Rune(code))];
        }

        if (int.TryParse(search, NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out code))
            return [CharInfoWrapper.Create(new Rune(code))];

        // Search by description
        var result = new List<CharInfoWrapper>();
        foreach (var entry in Unicode.AllCharacters)
        {
            if (entry.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
            {
                result.Add(new CharInfoWrapper(entry));
                if (result.Count > 100)
                    break;
            }
        }

        return result;
    }
}
