namespace Meziantou.OnlineTools.Utils;

internal static class LoremIpsumGenerator
{
    private static readonly string[] Words =
    [
        "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
        "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
        "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
        "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
        "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
        "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
        "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
        "deserunt", "mollit", "anim", "id", "est", "laborum"
    ];

    public static IEnumerable<string> Paragraphs(int wordsPerSentence, int sentencesPerParagraph, int paragraphCount)
    {
        for (var i = 0; i < paragraphCount; i++)
        {
            yield return Paragraph(wordsPerSentence, sentencesPerParagraph);
        }
    }

    private static string Paragraph(int wordsPerSentence, int sentencesPerParagraph)
    {
        var sentences = new List<string>();
        for (var i = 0; i < sentencesPerParagraph; i++)
        {
            sentences.Add(Sentence(wordsPerSentence));
        }
        return string.Join(' ', sentences);
    }

    [SuppressMessage("Security", "CA5394:Do not use insecure randomness")]
    private static string Sentence(int wordCount)
    {
        var words = new List<string>();
        for (var i = 0; i < wordCount; i++)
        {
            var word = Words[Random.Shared.Next(Words.Length)];
            words.Add(i is 0 ? char.ToUpperInvariant(word[0]) + word[1..] : word);
        }
        return string.Join(' ', words) + ".";
    }
}
